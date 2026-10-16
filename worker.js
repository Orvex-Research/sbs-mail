export default {
  async email(message, env, ctx) {
    try {
      // 1. Read the raw message content
      const raw = await new Response(message.raw).text();

      // 2. Extract headers for metadata
      const subjectMatch = raw.match(/^Subject: (.*)$/im);
      const fromMatch = raw.match(/^From: (.*)$/im);
      const toMatch = raw.match(/^To: (.*)$/im);

      const subject = subjectMatch ? subjectMatch[1].trim() : "(No Subject)";
      const fromHeader = fromMatch ? fromMatch[1].trim() : message.from;

      let finalToEmail = message.to;
      if (toMatch) {
        const headerTo = toMatch[1].trim();
        const emailOnly = headerTo.match(/<([^>]+)>/);
        finalToEmail = emailOnly ? emailOnly[1] : headerTo.split(',')[0].trim();
      }

      // 3. Prepare data for Supabase
      let bodySnippet = "";
      const bodyStart = raw.search(/\r?\n\r?\n/);
      if (bodyStart !== -1) {
        bodySnippet = raw.substring(bodyStart).trim().substring(0, 200).replace(/\s+/g, " ");
      } else {
        bodySnippet = raw.substring(0, 200).replace(/\s+/g, " ");
      }

      const emailData = {
        to_email: finalToEmail,
        from_header: fromHeader,
        subject: subject,
        body_html: raw,         // RAW content for the frontend parser
        body_text: "",          // Placeholder to avoid DB errors
        snippet: bodySnippet,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
      };

      const supabaseUrl = env.SUPABASE_URL;
      const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

      if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment variables");
      }

      const response = await fetch(`${supabaseUrl}/rest/v1/emails`, {
        method: "POST",
        headers: {
          "apikey": supabaseServiceKey,
          "Authorization": `Bearer ${supabaseServiceKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=minimal"
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    } catch (e) {
      console.error("Worker Execution Error:", e.message);
    }
  }
}