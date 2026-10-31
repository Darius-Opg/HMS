import nodemailer from "nodemailer";

function getSmtpTransport() {
    const host = process.env.SMTP_HOST || "smtp.gmail.com";
    const port = Number(process.env.SMTP_PORT || 465);
    const user = process.env.SMTP_USER;
    const password = process.env.SMTP_APP_PASSWORD?.replace(/\s/g, "");
    const secure = process.env.SMTP_SECURE === undefined
        ? port === 465
        : process.env.SMTP_SECURE.toLowerCase() === "true";

    if (!user || !password || !Number.isInteger(port) || port <= 0) {
        throw new Error("SMTP_USER, SMTP_APP_PASSWORD, and a valid SMTP_PORT must be configured");
    }

    return nodemailer.createTransport({ host, port, secure, auth: { user, pass: password } });
}

function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
    })[character]);
}

export async function sendPasswordResetEmail({ to, name, resetUrl }) {
    const from = process.env.MAIL_FROM || process.env.SMTP_USER;
    if (!from) throw new Error("MAIL_FROM or SMTP_USER must be configured");

    const safeName = escapeHtml(name || "there");
    const transport = getSmtpTransport();
    await transport.sendMail({
        from,
        to,
        subject: "Reset your HMS password",
        text: `Hello ${name || "there"},\n\nAn administrator requested a password reset for your account. Use this one-time link within ${process.env.PASSWORD_RESET_TTL_MINUTES || 60} minutes:\n\n${resetUrl}\n\nIf you did not expect this email, contact your administrator.`,
        html: `<p>Hello ${safeName},</p><p>An administrator requested a password reset for your account.</p><p><a href="${escapeHtml(resetUrl)}">Set a new password</a></p><p>This one-time link expires in ${Number(process.env.PASSWORD_RESET_TTL_MINUTES || 60)} minutes. If you did not expect this email, contact your administrator.</p>`,
    });
    await transport.close();
}
