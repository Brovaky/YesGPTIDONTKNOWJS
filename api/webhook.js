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
  embeds: z.array(EmbedSchema).max(10)
}).strict();

export default function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "1" });
  }

  let data;
  try {
    data = WebhookSchema.parse(req.body);
  } catch (e) {
    return res.status(400).json({
      error: "2",
      details: e.errors
    });
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

  return res.status(200).json({
    ok: true,
    webhook: formatted
  });
}
