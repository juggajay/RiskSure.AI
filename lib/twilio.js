// Twilio SMS integration
// Uses Twilio REST API for SMS delivery
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
/**
 * Check if Twilio is configured
 */
export function isTwilioConfigured() {
    var accountSid = process.env.TWILIO_ACCOUNT_SID;
    var authToken = process.env.TWILIO_AUTH_TOKEN;
    var phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    return !!(accountSid && authToken && phoneNumber);
}
/**
 * Get Twilio configuration status
 */
export function getTwilioConfig() {
    var accountSid = process.env.TWILIO_ACCOUNT_SID;
    var authToken = process.env.TWILIO_AUTH_TOKEN;
    var phoneNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!accountSid || !authToken || !phoneNumber) {
        return { configured: false };
    }
    return {
        configured: true,
        fromNumber: phoneNumber
    };
}
/**
 * Send an SMS via Twilio
 */
export function sendSms(options) {
    return __awaiter(this, void 0, void 0, function () {
        var accountSid, authToken, fromNumber, url, formData, response, data, error_1, errorMessage;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    accountSid = process.env.TWILIO_ACCOUNT_SID;
                    authToken = process.env.TWILIO_AUTH_TOKEN;
                    fromNumber = process.env.TWILIO_PHONE_NUMBER;
                    // Check for dev mode simulation
                    if (process.env.NODE_ENV === 'development' && (!accountSid || accountSid === 'test' || accountSid.startsWith('AC_TEST'))) {
                        console.log('[Twilio DEV] Would send SMS:', {
                            to: options.to,
                            from: fromNumber,
                            message: options.message.substring(0, 50) + (options.message.length > 50 ? '...' : '')
                        });
                        return [2 /*return*/, {
                                success: true,
                                messageId: "dev-sms-".concat(Date.now())
                            }];
                    }
                    if (!accountSid || !authToken || !fromNumber) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Twilio credentials not configured'
                            }];
                    }
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 4, , 5]);
                    url = "https://api.twilio.com/2010-04-01/Accounts/".concat(accountSid, "/Messages.json");
                    formData = new URLSearchParams();
                    formData.append('To', options.to);
                    formData.append('From', fromNumber);
                    formData.append('Body', options.message);
                    return [4 /*yield*/, fetch(url, {
                            method: 'POST',
                            headers: {
                                'Authorization': "Basic ".concat(Buffer.from("".concat(accountSid, ":").concat(authToken)).toString('base64')),
                                'Content-Type': 'application/x-www-form-urlencoded'
                            },
                            body: formData.toString()
                        })];
                case 2:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 3:
                    data = _a.sent();
                    if (response.ok) {
                        console.log('[Twilio] SMS sent successfully:', {
                            to: options.to,
                            messageId: data.sid,
                            status: data.status
                        });
                        return [2 /*return*/, {
                                success: true,
                                messageId: data.sid
                            }];
                    }
                    else {
                        console.error('[Twilio] Failed to send SMS:', data);
                        return [2 /*return*/, {
                                success: false,
                                error: data.message || 'Failed to send SMS'
                            }];
                    }
                    return [3 /*break*/, 5];
                case 4:
                    error_1 = _a.sent();
                    errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                    console.error('[Twilio] Error sending SMS:', errorMessage);
                    return [2 /*return*/, {
                            success: false,
                            error: errorMessage
                        }];
                case 5: return [2 /*return*/];
            }
        });
    });
}
/**
 * Send a critical alert SMS
 */
export function sendCriticalAlert(params) {
    return __awaiter(this, void 0, void 0, function () {
        var phoneNumber, subcontractorName, projectName, issue, message;
        return __generator(this, function (_a) {
            phoneNumber = params.phoneNumber, subcontractorName = params.subcontractorName, projectName = params.projectName, issue = params.issue;
            message = "CRITICAL ALERT - RiskShield AI\n\nSubcontractor: ".concat(subcontractorName, "\nProject: ").concat(projectName, "\n\nIssue: ").concat(issue, "\n\nPlease take immediate action.");
            return [2 /*return*/, sendSms({
                    to: phoneNumber,
                    message: message
                })];
        });
    });
}
/**
 * Send an expiration warning SMS
 */
export function sendExpirationWarningSms(params) {
    return __awaiter(this, void 0, void 0, function () {
        var phoneNumber, subcontractorName, projectName, expiryDate, daysRemaining, urgency, message;
        return __generator(this, function (_a) {
            phoneNumber = params.phoneNumber, subcontractorName = params.subcontractorName, projectName = params.projectName, expiryDate = params.expiryDate, daysRemaining = params.daysRemaining;
            urgency = daysRemaining <= 7 ? 'URGENT' : 'REMINDER';
            message = "".concat(urgency, ": ").concat(subcontractorName, "'s COC for ").concat(projectName, " expires ").concat(expiryDate, " (").concat(daysRemaining, " days). Please update immediately. - RiskShield AI");
            return [2 /*return*/, sendSms({
                    to: phoneNumber,
                    message: message
                })];
        });
    });
}
/**
 * Send a stop work risk SMS
 */
export function sendStopWorkRiskSms(params) {
    return __awaiter(this, void 0, void 0, function () {
        var phoneNumber, subcontractorName, projectName, reason, message;
        return __generator(this, function (_a) {
            phoneNumber = params.phoneNumber, subcontractorName = params.subcontractorName, projectName = params.projectName, reason = params.reason;
            message = "STOP WORK RISK - ".concat(subcontractorName, " on ").concat(projectName, ": ").concat(reason, ". Immediate action required. - RiskShield AI");
            return [2 /*return*/, sendSms({
                    to: phoneNumber,
                    message: message
                })];
        });
    });
}
