import { z } from 'zod';


export const HostSchema = z.object({
	host: z.string().trim().nonempty().max(320),
	name: z.string().trim().optional(),
	description: z.string().trim().optional(),
	icon: z.string().trim().optional(),
});
