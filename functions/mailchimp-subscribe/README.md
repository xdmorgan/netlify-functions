# Mailchimp Subscribe

Use the Mailchimp v3 API to perform a determined subscribe request

## Example request

POST a JSON body with the following structure:

- `email:string` — required
- `list_id:string` — required
- `interests:string[]` — optional

```json
{
  "email": "ay@email.com",
  "list_id": "2450jasf28",
  "interests": ["3242ada24"]
}
```

## API Key & Env Config

A `MAILCHIMP_API_KEY` is required and should have permissions to modify the desired list id. See Netlify docs for adding env vars and Mailchimp for API key creation.

## Requests

1. Check if existing audience member

   - If existing and subscribed and done
   - If existing but unsubscribed, resubscribe and done
   - If existing but missing interests, update preferences and done

1. Add subscriber to list, with optional interests
