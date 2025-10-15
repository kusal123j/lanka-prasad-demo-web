// smsService.js

import axios from "axios";

const API_TOKEN = "1513|w2T2QmlZAPpv62HAEEfTsOCo4QQHxwc7VYvoYsGXcea61ff9";
const SMS_API_URL = "https://app.text.lk/api/v3/sms/send";

/**
 * Convert local Sri Lankan number to international format
 * @param {string} number - e.g., 0703473403
 * @returns {string} e.g., 94703473403
 */
function formatSriLankanNumber(number) {
  // Remove leading 0 if exists and add country code 94
  if (number.startsWith("0")) {
    return "94" + number.slice(1);
  }
  return number;
}

/**
 * Send SMS to a single recipient (single attempt)
 * @param {string} recipient - Mobile number (local or full format)
 * @param {string} senderId - Sender ID (max 11 characters)
 * @param {string} message - SMS content
 */
async function sendSMS(recipient, senderId, message) {
  try {
    const formattedNumber = formatSriLankanNumber(recipient);

    const payload = {
      recipient: formattedNumber,
      sender_id: senderId,
      type: "plain",
      message,
    };

    const response = await axios.post(SMS_API_URL, payload, {
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });

    if (response.data.status === "success") {
      return { status: "success", data: response.data };
    } else {
      return { status: "error", data: response.data };
    }
  } catch (error) {
    return {
      status: "error",
      message: error.response?.data?.message || error.message,
    };
  }
}

/**
 * Retry wrapper for sendSMS (up to 5 attempts)
 * @param {string} recipient
 * @param {string} senderId
 * @param {string} message
 * @param {number} maxRetries - default 5
 * @param {number} delayMs - default 3000ms between attempts
 */
async function sendSMSWithRetry(
  recipient,
  senderId,
  message,
  maxRetries = 5,
  delayMs = 3000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const result = await sendSMS(recipient, senderId, message);

    if (result.status === "success") {
      return result; // ✅ Success
    }

    if (attempt < maxRetries) {
      console.warn(
        `SMS attempt ${attempt} failed. Retrying in ${delayMs}ms... (${
          result.message || "Unknown error"
        })`
      );
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error("Failed to send SMS after multiple attempts");
}

export { sendSMS, sendSMSWithRetry };
