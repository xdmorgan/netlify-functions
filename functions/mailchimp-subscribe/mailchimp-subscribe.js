const crypto = require("crypto");
const Mailchimp = require("mailchimp-api-v3");
const validate = require("./validations");

const { MAILCHIMP_API_KEY } = process.env;

exports.handler = async (event, context) => {
  // Validate env config
  const checked_env = check_env(process.env);
  if (!checked_env.valid) return checked_env.error_response;

  // Validate request body
  const { body, ...checked_body } = check_body(event.body);
  if (!checked_body.valid) return checked_body.error_response;

  // Create MC API class
  const mc_api = new Mailchimp(MAILCHIMP_API_KEY);

  // Read from parsed body
  const { email, list_id, interests = [] } = body;

  // Check if user already exists
  const checked_member = await check_existing(
    { email, list_id, interests },
    mc_api
  );
  if (
    checked_member.exists &&
    checked_member.is_subscribed &&
    checked_member.has_interests
  ) {
    return checked_member.success_response;
  }

  // user exists but isnt subscribes or lacks interest(s)
  if (
    checked_member.exists &&
    (!checked_member.is_subscribed || !checked_member.has_interests)
  ) {
    const update_opts = { email, list_id, status: "subscribed", interests };
    const updated = await update_member(update_opts, mc_api);
    return updated.success_response;
  }

  // No existing user, create a new one
  const create_opts = { email, list_id, status: "subscribed", interests };
  const created = await create_member(create_opts, mc_api);
  return created ? created.success_response : created.error_response;
};

function check_env({ MAILCHIMP_API_KEY } = {}) {
  const error = "Invalid MAILCHIMP_API_KEY env var: " + MAILCHIMP_API_KEY;
  return {
    valid: !!MAILCHIMP_API_KEY,
    error_response: response({ error }, 500)
  };
}

function check_body(request_body = {}) {
  const body = JSON.parse(request_body);
  let error = null;
  try {
    validate.is_email("body.email", body.email);
    validate.is_length("body.list_id", body.list_id, 4, 16);
  } catch (e) {
    error = e.message;
  }
  return {
    body,
    valid: error === null,
    error_response: response(body, 400, error)
  };
}

async function check_existing({ email, list_id, interests }, api) {
  const hash = create_md5_hash(email);
  const path = `/lists/${list_id}/members/${hash}`;
  let [status, error, has_interests] = [null, null, null];
  try {
    const result = await api.get({ path });
    status = result.status;
    has_interests = has_all_interests(interests, result.interests);
  } catch (e) {
    error = e.message;
  }
  return {
    exists: !!status,
    is_subscribed: status === "subscribed",
    has_interests,
    status,
    error,
    success_response: response({
      email,
      subscribed: true,
      existing_member: true,
      profile_updated: false
    })
  };
}

async function update_member({ email, list_id, status, interests }, api) {
  const hash = create_md5_hash(email);
  const path = `/lists/${list_id}/members/${hash}`;
  const body = {
    status,
    ...(interests.length ? format_interests(interests) : {})
  };
  let [error] = [null];
  try {
    await api.patch({ path, body });
  } catch (e) {
    error = e.message;
  }
  return {
    error,
    success_response: response({
      email,
      subscribed: true,
      existing_member: true,
      profile_updated: true
    })
  };
}

async function create_member(
  { email, list_id, status, interests, merge_fields = {} },
  api
) {
  const path = `/lists/${list_id}/members`;
  const body = {
    email_address: email,
    status,
    merge_fields,
    ...format_interests(interests)
  };
  let [statusCode, error] = [null, null];
  try {
    await api.post({ path, body });
  } catch (e) {
    statusCode = e.status;
    error = e.message;
  }

  return {
    created: !error,
    error_response: response({}, statusCode, error),
    success_response: response({
      email,
      subscribed: true,
      existing_member: false,
      profile_updated: false
    })
  };
}

function format_interests(arr = []) {
  return { interests: arr.reduce((acc, cur) => ({ ...acc, [cur]: true }), {}) };
}

function response(data = {}, statusCode = 200, error = null) {
  return { statusCode, body: JSON.stringify({ error, data }) };
}

function create_md5_hash(email) {
  return crypto
    .createHash("md5")
    .update(email)
    .digest("hex");
}

function compare_interests(should_have, all) {
  return should_have.map(interest => all[interest]);
}

function has_all_interests(should_have, all) {
  return !compare_interests(should_have, all).some(x => x === false);
}
