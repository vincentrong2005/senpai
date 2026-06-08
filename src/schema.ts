export const Schema = z.object({
  时间: z.string(),
  星期: z.string(),
  地点: z.string(),
  精液存量: z.coerce.number().transform(value => _.clamp(value, 0, 100)),
  已完成的性爱地点: z.array(z.string()),
});
