import { z } from 'zod';



export const HostSchema = z.string().trim().nonempty().max(320);
