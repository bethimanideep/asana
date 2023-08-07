const express = require('express');
const redis = require('redis');
const Airtable = require('airtable');
const axios = require('axios')
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const redisClient = redis.createClient({
  url: "redis://default:0000@redis-19089.c8.us-east-1-4.ec2.cloud.redislabs.com:19089"
});

const base = new Airtable({ apiKey: 'YOUR_AIRTABLE_API_KEY' }).base('YOUR_BASE_ID');

const app = express();
app.use(express.json());

let asanaToken = '1/1205216047640730:2f9adb0ad084c4545f85eff5efb8850e';

app.post('/webhook', async (req, res) => {
  if (req.headers["x-hook-secret"]) {
    console.log("This is a new webhook");
    const secret = req.headers["x-hook-secret"];
    await redisClient.set("webhook_secret", secret);
    redisClient.keys('*', (err, keys) => {
      if (err) {
        console.error('Error fetching keys:', err);
      } else {
        console.log('All keys in Redis:', keys);
      }
    });
    
    res.setHeader("X-Hook-Secret", secret);
    res.sendStatus(200);
  } else {
    console.error("Something went wrong!");
    res.sendStatus(500); // Internal server error
  }
});

app.get('/createwebhook', async (req, res) => {
  let { asanatoken, resource, target } = req.body
  console.log(asanatoken, resource, target);
  const Asana = require('asana');
  let defaultClient = Asana.ApiClient.instance;

  // Configure OAuth2 access token for authorization: oauth2
  let oauth2 = defaultClient.authentications['oauth2'];
  oauth2.accessToken = asanatoken;

  let apiInstance = new Asana.WebhooksApi();
  let body = new Asana.WebhooksBody.constructFromObject({
    "data": {
      "filters": [
        {
          "action": "changed",
          "resource_type": "task",
          "fields": [
            "TaskId",
            "Name",
            "Assigne",
            "Duedate",
            "Description"
          ]
        }
      ],
      resource,
      target
    }
  }); // WebhooksBody | The webhook workspace and target.
  let opts = {
    'opt_fields': ["active", "created_at", "filters", "filters.action", "filters.fields", "filters.resource_subtype", "last_failure_at", "last_failure_content", "last_success_at", "resource", "resource.name", "target"] // [String] | This endpoint returns a compact resource, which excludes some properties by default. To include those optional properties, set this query parameter to a comma-separated list of the properties you wish to include.
  };
  let data;
  apiInstance.createWebhook(body, opts, (error, data, response) => {
    if (error) {
      console.error(error);
    } else {
      data=JSON.stringify(data.d
      console.log('API called successfully. Returned data: ' + JSON.stringify(data, null, 2));
    }
  });
  res.send(data)
  // await redisClient.set("webhook_secret", data.gid);
  // redisClient.keys('*', (err, keys) => {
  //   if (err) {
  //     res.send(err)
  //     console.error('Error fetching keys:', err);
  //   } else {
  //     console.log('All keys in Redis:', keys);
  //     res.send(keys)
  //   }
  // });


  // try {
  //   const secret = await redisClient.get("webhook_secret");

  //   if (secret) {
  //     console.log("Retrieved secret from Redis:", secret);
  //     res.status(200).json({ secret });
  //   } else {
  //     res.status(404).json({ message: "Secret not found in Redis." });
  //   }
  // } catch (err) {
  //   console.error("Error retrieving secret from Redis:", err);
  //   res.sendStatus(500); // Internal server error
  // }
});
app.get("/deleting", async (req, res) => {
  const targetUrl = 'https://5b65-136-185-251-122.ngrok-free.app/webhook';
  const resourceId = '1205218628961039';

  // Check if a webhook already exists for the given resource and target
  const existingWebhooks = await axios.get(`https://app.asana.com/api/1.0/webhooks?resource=${resourceId}`, {
    headers: {
      "Authorization": `Bearer ${asanaToken}`
    }
  });
  console.log(existingWebhooks);
  if (existingWebhooks && existingWebhooks.data && existingWebhooks.data.data && existingWebhooks.data.data.length > 0) {
    // Delete the old webhook
    const webhookId = existingWebhooks.data.data[0].gid;
    const workspaceId = existingWebhooks.data.data[0].workspace.gid;

    // await axios.delete(`https://app.asana.com/api/1.0/webhooks/${webhookId}`, {
    //   headers: {
    //     "Authorization": `Bearer ${asanaToken}`
    //   },
    //   data: {
    //     workspace: workspaceId // Provide the workspace ID in the request
    //   }
    // });
    // console.log("Deleted the existing webhook.");
  }

  // Create a new webhook
  // const response = await axios.post('https://app.asana.com/api/1.0/webhooks', {
  //   resource: resourceId,
  //   target: targetUrl
  // }, {
  //   headers: {
  //     "Authorization": `Bearer ${asanaToken}`
  //   }
  // });
  // console.log("Created a new webhook. Response:", response.data);
  res.send("d")
})


app.listen(3000, async () => {
  try {
    await redisClient.connect();
    console.log('Server is running on port 3000 and Redis connected');
  } catch (error) {
    console.error('Error connecting to Redis:', error);
  }
});
