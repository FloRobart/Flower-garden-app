import { z } from 'zod';
import { HostSchema } from './hosts.schemas';



export type Host = z.infer<typeof HostSchema>;
