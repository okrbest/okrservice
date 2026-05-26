import { NextFunction, Request, Response } from 'express';
import * as bcrypt from 'bcryptjs';
import { getSubdomain } from '@erxes/api-utils/src/core';
import { generateModels } from '../connectionResolver';

export async function validateRpaClient(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { clientId, secret } = req.body as Record<string, string>;

  if (!clientId || !secret) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Missing credentials' });
    return;
  }

  const subdomain = getSubdomain(req);
  const models = await generateModels(subdomain);
  const client = await models.Clients.findOne({ clientId }).lean();

  if (!client) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    return;
  }

  const isValid = await bcrypt.compare(secret, client.clientSecret);

  if (!isValid) {
    res.status(401).json({ code: 'UNAUTHORIZED', message: 'Invalid credentials' });
    return;
  }

  if (client.whiteListedIps.length > 0 && !client.whiteListedIps.includes(req.ip ?? '')) {
    res.status(403).json({ code: 'FORBIDDEN', message: 'IP not allowed' });
    return;
  }

  next();
}
