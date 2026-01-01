import { z } from "zod";

const FieldSchema = z.object({
  name: z.string().min(1).max(256),
  value: z.string().min(1).max(1024),
  inline: z.boolean().optional()
}).strict();

const EmbedSchema = z.object({
  title: z.string().max(256).optional(),
  description: z.string().max(4096).optional(),
  color: z.number().int().min(0).max(0xffffff).optional(),
  fields: z.array(FieldSchema).max(25).optional(),
  timestamp: z.string().datetime().optional(),
  footer: z.object({
    text: z.string().max(2048)
  }).optional()
}).strict();

const WebhookSchema = z.object({
  content: z.string().min(1).max(2000),
  embeds: z.array(EmbedSchema).min(1).max(10)
}).strict();

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "POST only" });
  }

  let data;
  try {
    data = WebhookSchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({
      error: "Invalid format",
      details: e.errors
    });
  }

  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  if (!webhookUrl) {
    return res.status(500).json({ error: "Webhook not configured" });
  }

  const embed = data.embeds[0];

  const formatted = {
    content: data.content.trim(),
    embeds: [{
      title: embed.title?.trim(),
      description: embed.description?.trim(),
      color: embed.color ?? 16711680,
      timestamp: embed.timestamp ?? new Date().toISOString(),
      footer: embed.footer,
      fields: embed.fields?.map(f => ({
        name: f.name.trim(),
        value: f.value.trim(),
        inline: !!f.inline
      }))
    }]
  };

  const r = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formatted)
  });

  if (!r.ok) {
    const text = await r.text();
    return res.status(502).json({
      error: "Discord rejected webhook",
      status: r.status,
      body: text
    });
  }

  return res.status(200).json({ ok: true });
}
