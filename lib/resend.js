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
import { Resend } from 'resend';
/**
 * HTML-escape a string to prevent XSS attacks in email templates
 * Escapes: & < > " ' to their HTML entity equivalents
 */
export function escapeHtml(unsafe) {
    if (unsafe === undefined || unsafe === null)
        return '';
    return String(unsafe)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
// Initialize Resend client
var resendClient = null;
function getResendClient() {
    if (resendClient)
        return resendClient;
    var apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
        console.warn('[Resend] API key not configured');
        return null;
    }
    resendClient = new Resend(apiKey);
    return resendClient;
}
/**
 * Get the configured from email address
 */
export function getFromEmail() {
    return process.env.RESEND_FROM_EMAIL || 'noreply@riskshield.ai';
}
/**
 * Get the from name for emails
 */
export function getFromName() {
    return process.env.RESEND_FROM_NAME || 'RiskShield AI';
}
/**
 * Check if Resend is configured and ready
 */
export function isEmailConfigured() {
    return !!process.env.RESEND_API_KEY;
}
// Backwards compatibility alias
export var isSendGridConfigured = isEmailConfigured;
/**
 * Render an email template by replacing placeholders with actual values
 * Placeholders are in the format {{placeholder_name}}
 */
export function renderTemplate(template, data, escapeValues) {
    if (escapeValues === void 0) { escapeValues = true; }
    var rendered = template;
    for (var _i = 0, _a = Object.entries(data); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (value !== undefined && value !== null) {
            var placeholder = new RegExp("\\{\\{".concat(key, "\\}\\}"), 'g');
            // Security: Escape HTML by default to prevent XSS
            var safeValue = escapeValues ? escapeHtml(String(value)) : String(value);
            rendered = rendered.replace(placeholder, safeValue);
        }
    }
    return rendered;
}
/**
 * Convert plain text email body to basic HTML
 */
export function textToHtml(text) {
    // Escape HTML entities
    var escaped = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    // Convert line breaks to <br> and paragraphs
    var withBreaks = escaped
        .split('\n\n')
        .map(function (paragraph) { return "<p>".concat(paragraph.replace(/\n/g, '<br>'), "</p>"); })
        .join('');
    // Wrap in basic HTML template
    return "\n    <!DOCTYPE html>\n    <html>\n    <head>\n      <meta charset=\"utf-8\">\n      <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n      <style>\n        body {\n          font-family: Arial, sans-serif;\n          line-height: 1.6;\n          color: #333;\n          max-width: 600px;\n          margin: 0 auto;\n          padding: 20px;\n        }\n        p {\n          margin: 0 0 16px 0;\n        }\n        .footer {\n          margin-top: 32px;\n          padding-top: 16px;\n          border-top: 1px solid #e5e5e5;\n          font-size: 12px;\n          color: #666;\n        }\n      </style>\n    </head>\n    <body>\n      ".concat(withBreaks, "\n      <div class=\"footer\">\n        <p>This email was sent by RiskShield AI - Insurance Compliance Management</p>\n      </div>\n    </body>\n    </html>\n  ");
}
/**
 * Send an email via Resend
 */
export function sendEmail(options) {
    return __awaiter(this, void 0, void 0, function () {
        var apiKey, client, fromAddress, _a, data, error, error_1, errorMessage;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    apiKey = process.env.RESEND_API_KEY;
                    // Check for dev mode simulation
                    if (process.env.NODE_ENV === 'development' && (!apiKey || apiKey === 'test' || apiKey === 'dev')) {
                        console.log('[Resend DEV] Would send email:', {
                            to: options.to,
                            subject: options.subject,
                            cc: options.cc
                        });
                        return [2 /*return*/, {
                                success: true,
                                messageId: "dev-".concat(Date.now())
                            }];
                    }
                    client = getResendClient();
                    if (!client) {
                        return [2 /*return*/, {
                                success: false,
                                error: 'Resend API key not configured'
                            }];
                    }
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 3, , 4]);
                    fromAddress = "".concat(getFromName(), " <").concat(getFromEmail(), ">");
                    return [4 /*yield*/, client.emails.send({
                            from: fromAddress,
                            to: options.to,
                            subject: options.subject,
                            html: options.html,
                            text: options.text || options.html.replace(/<[^>]*>/g, ''),
                            cc: options.cc,
                            replyTo: options.replyTo,
                        })];
                case 2:
                    _a = _b.sent(), data = _a.data, error = _a.error;
                    if (error) {
                        console.error('[Resend] Failed to send email:', error);
                        return [2 /*return*/, {
                                success: false,
                                error: error.message
                            }];
                    }
                    console.log('[Resend] Email sent successfully:', {
                        to: options.to,
                        subject: options.subject,
                        messageId: data === null || data === void 0 ? void 0 : data.id
                    });
                    return [2 /*return*/, {
                            success: true,
                            messageId: data === null || data === void 0 ? void 0 : data.id
                        }];
                case 3:
                    error_1 = _b.sent();
                    errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error';
                    console.error('[Resend] Failed to send email:', errorMessage);
                    return [2 /*return*/, {
                            success: false,
                            error: errorMessage
                        }];
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Send a deficiency notification email
 */
export function sendDeficiencyEmail(params) {
    return __awaiter(this, void 0, void 0, function () {
        var recipientEmail, recipientName, ccEmails, subcontractorName, subcontractorAbn, projectName, deficiencies, dueDate, uploadLink, templateSubject, templateBody, deficiencyList, data, subject, body;
        return __generator(this, function (_a) {
            recipientEmail = params.recipientEmail, recipientName = params.recipientName, ccEmails = params.ccEmails, subcontractorName = params.subcontractorName, subcontractorAbn = params.subcontractorAbn, projectName = params.projectName, deficiencies = params.deficiencies, dueDate = params.dueDate, uploadLink = params.uploadLink, templateSubject = params.templateSubject, templateBody = params.templateBody;
            deficiencyList = deficiencies
                .map(function (d) {
                var desc = d.description || d.message || 'Unknown issue';
                var type = d.type || d.check_name;
                return type ? "- ".concat(type, ": ").concat(desc) : "- ".concat(desc);
            })
                .join('\n');
            data = {
                recipient_name: recipientName,
                subcontractor_name: subcontractorName,
                subcontractor_abn: subcontractorAbn,
                project_name: projectName,
                deficiency_list: deficiencyList,
                due_date: dueDate || 'As soon as possible',
                upload_link: uploadLink || process.env.NEXT_PUBLIC_APP_URL || 'https://riskshield.ai'
            };
            subject = templateSubject
                ? renderTemplate(templateSubject, data)
                : "Certificate of Currency Deficiency Notice - ".concat(subcontractorName, " / ").concat(projectName);
            body = templateBody
                ? renderTemplate(templateBody, data)
                : "Dear ".concat(recipientName, ",\n\nWe have reviewed the Certificate of Currency submitted for ").concat(subcontractorName, " (ABN: ").concat(subcontractorAbn, ") and found the following compliance issues for the ").concat(projectName, " project:\n\nDEFICIENCIES FOUND:\n").concat(deficiencyList, "\n\nACTION REQUIRED:\nPlease provide an updated Certificate of Currency that addresses the above deficiencies by ").concat(data.due_date, ".\n\nIf you have any questions or need clarification on the requirements, please don't hesitate to contact us.\n\nBest regards,\nRiskShield AI Compliance Team");
            return [2 /*return*/, sendEmail({
                    to: recipientEmail,
                    subject: subject,
                    html: textToHtml(body),
                    text: body,
                    cc: ccEmails
                })];
        });
    });
}
/**
 * Send a follow-up email for pending compliance
 */
export function sendFollowUpEmail(params) {
    return __awaiter(this, void 0, void 0, function () {
        var recipientEmail, subcontractorName, projectName, deficiencies, daysWaiting, uploadLink, isUrgent, deficiencyList, subject, body;
        return __generator(this, function (_a) {
            recipientEmail = params.recipientEmail, subcontractorName = params.subcontractorName, projectName = params.projectName, deficiencies = params.deficiencies, daysWaiting = params.daysWaiting, uploadLink = params.uploadLink;
            isUrgent = daysWaiting >= 7;
            deficiencyList = deficiencies
                .map(function (d) {
                var desc = d.description || d.message || 'Unknown issue';
                return "- ".concat(desc);
            })
                .join('\n');
            subject = "[Follow-up".concat(isUrgent ? ' URGENT' : '', "] Insurance Certificate Required - ").concat(projectName);
            body = "Dear ".concat(subcontractorName, ",\n\nThis is a follow-up regarding your Certificate of Currency for project \"").concat(projectName, "\".\n\nWe sent you a notification ").concat(daysWaiting, " day").concat(daysWaiting !== 1 ? 's' : '', " ago regarding deficiencies with your submitted insurance certificate. We have not yet received an updated certificate addressing these issues.\n\n").concat(isUrgent ? 'URGENT: Immediate action is required to maintain compliance on this project.\n\n' : '', "Original Issues:\n").concat(deficiencyList || 'Please contact us for specific details.', "\n\nPlease submit an updated Certificate of Currency as soon as possible to maintain compliance.\n\n").concat(uploadLink ? "Upload your updated certificate here: ".concat(uploadLink, "\n\n") : '', "If you have already submitted an updated certificate, please disregard this message.\n\nThank you for your prompt attention to this matter.\n\nBest regards,\nThe Compliance Team");
            return [2 /*return*/, sendEmail({
                    to: recipientEmail,
                    subject: subject,
                    html: textToHtml(body),
                    text: body
                })];
        });
    });
}
/**
 * Send a compliance confirmation email
 */
export function sendConfirmationEmail(params) {
    return __awaiter(this, void 0, void 0, function () {
        var recipientEmail, recipientName, subcontractorName, subcontractorAbn, projectName, subject, body;
        return __generator(this, function (_a) {
            recipientEmail = params.recipientEmail, recipientName = params.recipientName, subcontractorName = params.subcontractorName, subcontractorAbn = params.subcontractorAbn, projectName = params.projectName;
            subject = "Insurance Compliance Confirmed - ".concat(subcontractorName, " / ").concat(projectName);
            body = "Dear ".concat(recipientName, ",\n\nGreat news! The Certificate of Currency submitted for ").concat(subcontractorName, " (ABN: ").concat(subcontractorAbn, ") has been verified and meets all requirements for the ").concat(projectName, " project.\n\nVERIFICATION RESULT: APPROVED\n\n").concat(subcontractorName, " is now approved to work on the ").concat(projectName, " project. All insurance coverage requirements have been met.\n\nThank you for ensuring compliance with our insurance requirements. If you have any questions or need to update your certificate in the future, please don't hesitate to contact us.\n\nBest regards,\nRiskShield AI Compliance Team");
            return [2 /*return*/, sendEmail({
                    to: recipientEmail,
                    subject: subject,
                    html: textToHtml(body),
                    text: body
                })];
        });
    });
}
/**
 * Send a password reset email
 */
export function sendPasswordResetEmail(params) {
    return __awaiter(this, void 0, void 0, function () {
        var recipientEmail, recipientName, resetLink, _a, expiresInMinutes, subject, body;
        return __generator(this, function (_b) {
            recipientEmail = params.recipientEmail, recipientName = params.recipientName, resetLink = params.resetLink, _a = params.expiresInMinutes, expiresInMinutes = _a === void 0 ? 60 : _a;
            subject = 'Reset Your RiskShield AI Password';
            body = "Dear ".concat(recipientName, ",\n\nWe received a request to reset the password for your RiskShield AI account.\n\nClick the link below to reset your password:\n").concat(resetLink, "\n\nThis link will expire in ").concat(expiresInMinutes, " minutes.\n\nIf you didn't request a password reset, you can safely ignore this email. Your password will not be changed.\n\nBest regards,\nRiskShield AI Team");
            return [2 /*return*/, sendEmail({
                    to: recipientEmail,
                    subject: subject,
                    html: textToHtml(body),
                    text: body
                })];
        });
    });
}
/**
 * Send an expiration reminder email
 */
export function sendExpirationReminderEmail(params) {
    return __awaiter(this, void 0, void 0, function () {
        var recipientEmail, recipientName, subcontractorName, subcontractorAbn, projectName, expiryDate, daysUntilExpiry, uploadLink, isUrgent, subject, body;
        return __generator(this, function (_a) {
            recipientEmail = params.recipientEmail, recipientName = params.recipientName, subcontractorName = params.subcontractorName, subcontractorAbn = params.subcontractorAbn, projectName = params.projectName, expiryDate = params.expiryDate, daysUntilExpiry = params.daysUntilExpiry, uploadLink = params.uploadLink;
            isUrgent = daysUntilExpiry <= 7;
            subject = "".concat(isUrgent ? 'URGENT: ' : '', "Certificate Expiring Soon - ").concat(subcontractorName, " / ").concat(projectName);
            body = "Dear ".concat(recipientName, ",\n\nThis is a reminder that the Certificate of Currency for ").concat(subcontractorName, " (ABN: ").concat(subcontractorAbn, ") will expire on ").concat(expiryDate, ".\n\nPROJECT: ").concat(projectName, "\nDAYS UNTIL EXPIRY: ").concat(daysUntilExpiry, "\n\nACTION REQUIRED:\nPlease provide an updated Certificate of Currency before the expiration date to maintain compliance.\n\n").concat(uploadLink ? "You can upload the updated certificate here: ".concat(uploadLink, "\n\n") : '', "If you have any questions, please contact us.\n\nBest regards,\nRiskShield AI Compliance Team");
            return [2 /*return*/, sendEmail({
                    to: recipientEmail,
                    subject: subject,
                    html: textToHtml(body),
                    text: body
                })];
        });
    });
}
/**
 * Send a portal invitation email to a subcontractor
 */
export function sendInvitationEmail(params) {
    return __awaiter(this, void 0, void 0, function () {
        var recipientEmail, recipientName, subcontractorName, subcontractorAbn, projectName, builderName, onSiteDate, requirements, invitationLink, _a, expiresInDays, subject, requirementsList, body, htmlBody;
        return __generator(this, function (_b) {
            recipientEmail = params.recipientEmail, recipientName = params.recipientName, subcontractorName = params.subcontractorName, subcontractorAbn = params.subcontractorAbn, projectName = params.projectName, builderName = params.builderName, onSiteDate = params.onSiteDate, requirements = params.requirements, invitationLink = params.invitationLink, _a = params.expiresInDays, expiresInDays = _a === void 0 ? 7 : _a;
            subject = "Action Required: Upload Certificate of Currency for ".concat(projectName);
            requirementsList = requirements && requirements.length > 0
                ? requirements.map(function (r) { return "  - ".concat(r); }).join('\n')
                : '  - Current Certificate of Currency\n  - Valid Public Liability coverage\n  - Workers Compensation coverage';
            body = "Dear ".concat(recipientName || 'Subcontractor', ",\n\n").concat(builderName, " has added ").concat(subcontractorName, " (ABN: ").concat(subcontractorAbn, ") to their project and requires your Certificate of Currency before work can commence on site.\n\nPROJECT DETAILS\n---------------\nProject: ").concat(projectName, "\nBuilder: ").concat(builderName, "\n").concat(onSiteDate ? "On-Site Date: ".concat(onSiteDate) : 'On-Site Date: To be confirmed', "\n\nWHAT'S NEEDED\n-------------\n").concat(requirementsList, "\n\nClick the link below to securely upload your certificate:\n\n").concat(invitationLink, "\n\nThis secure link expires in ").concat(expiresInDays, " days. If you need a new link, visit the portal login page and enter your email address.\n\nQuestions? Contact ").concat(builderName, " directly for assistance.\n\nBest regards,\nRiskShield AI Compliance Team");
            htmlBody = "\n<!DOCTYPE html>\n<html>\n<head>\n  <meta charset=\"utf-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <style>\n    body {\n      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;\n      line-height: 1.6;\n      color: #1a1a1a;\n      max-width: 600px;\n      margin: 0 auto;\n      padding: 20px;\n      background-color: #f5f5f5;\n    }\n    .container {\n      background: white;\n      border-radius: 8px;\n      padding: 32px;\n      box-shadow: 0 2px 4px rgba(0,0,0,0.1);\n    }\n    .header {\n      text-align: center;\n      padding-bottom: 24px;\n      border-bottom: 2px solid #e5e5e5;\n      margin-bottom: 24px;\n    }\n    .header h1 {\n      color: #0066cc;\n      margin: 0;\n      font-size: 24px;\n    }\n    .section {\n      margin: 24px 0;\n      padding: 16px;\n      background: #f8f9fa;\n      border-radius: 6px;\n    }\n    .section-title {\n      font-weight: 600;\n      color: #333;\n      margin-bottom: 8px;\n      font-size: 14px;\n      text-transform: uppercase;\n      letter-spacing: 0.5px;\n    }\n    .section-content {\n      color: #555;\n    }\n    .cta-container {\n      text-align: center;\n      margin: 32px 0;\n    }\n    .cta-button {\n      display: inline-block;\n      background: #0066cc;\n      color: white !important;\n      text-decoration: none;\n      padding: 16px 32px;\n      border-radius: 6px;\n      font-weight: 600;\n      font-size: 16px;\n    }\n    .requirements {\n      list-style: none;\n      padding: 0;\n      margin: 0;\n    }\n    .requirements li {\n      padding: 8px 0;\n      border-bottom: 1px solid #eee;\n    }\n    .requirements li:last-child {\n      border-bottom: none;\n    }\n    .requirements li:before {\n      content: \"\\2713 \";\n      color: #0066cc;\n      font-weight: bold;\n    }\n    .footer {\n      margin-top: 32px;\n      padding-top: 16px;\n      border-top: 1px solid #e5e5e5;\n      font-size: 12px;\n      color: #888;\n      text-align: center;\n    }\n    .expiry-note {\n      font-size: 13px;\n      color: #666;\n      text-align: center;\n      margin-top: 16px;\n    }\n  </style>\n</head>\n<body>\n  <div class=\"container\">\n    <div class=\"header\">\n      <h1>Certificate of Currency Required</h1>\n    </div>\n\n    <p>Dear ".concat(escapeHtml(recipientName) || 'Subcontractor', ",</p>\n\n    <p><strong>").concat(escapeHtml(builderName), "</strong> has added <strong>").concat(escapeHtml(subcontractorName), "</strong> to their project and requires your Certificate of Currency before work can commence.</p>\n\n    <div class=\"section\">\n      <div class=\"section-title\">Project Details</div>\n      <div class=\"section-content\">\n        <strong>Project:</strong> ").concat(escapeHtml(projectName), "<br>\n        <strong>Builder:</strong> ").concat(escapeHtml(builderName), "<br>\n        <strong>On-Site Date:</strong> ").concat(escapeHtml(onSiteDate) || 'To be confirmed', "\n      </div>\n    </div>\n\n    <div class=\"section\">\n      <div class=\"section-title\">What's Needed</div>\n      <ul class=\"requirements\">\n        ").concat(requirements && requirements.length > 0
                ? requirements.map(function (r) { return "<li>".concat(escapeHtml(r), "</li>"); }).join('')
                : '<li>Current Certificate of Currency</li><li>Valid Public Liability coverage</li><li>Workers Compensation coverage</li>', "\n      </ul>\n    </div>\n\n    <div class=\"cta-container\">\n      <a href=\"").concat(invitationLink, "\" class=\"cta-button\">Upload Your Certificate</a>\n    </div>\n\n    <p class=\"expiry-note\">This secure link expires in ").concat(expiresInDays, " days.</p>\n\n    <div class=\"footer\">\n      <p>RiskShield AI - Automated Insurance Compliance Verification</p>\n      <p>Questions? Contact ").concat(escapeHtml(builderName), " directly for assistance.</p>\n    </div>\n  </div>\n</body>\n</html>");
            // In dev mode, log the invitation link to console
            if (process.env.NODE_ENV === 'development') {
                console.log('\n════════════════════════════════════════════════════════════');
                console.log('INVITATION EMAIL (Dev Mode - Not Actually Sent)');
                console.log('════════════════════════════════════════════════════════════');
                console.log("To: ".concat(recipientEmail));
                console.log("Subject: ".concat(subject));
                console.log("Project: ".concat(projectName));
                console.log("Builder: ".concat(builderName));
                console.log('');
                console.log('INVITATION LINK:');
                console.log(invitationLink);
                console.log('════════════════════════════════════════════════════════════\n');
            }
            return [2 /*return*/, sendEmail({
                    to: recipientEmail,
                    subject: subject,
                    html: htmlBody,
                    text: body
                })];
        });
    });
}
