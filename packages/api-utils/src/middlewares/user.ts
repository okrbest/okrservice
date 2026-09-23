import * as telemetry from 'erxes-telemetry';
import * as jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';

import { getSubdomain, sendMessage } from '../core';
import { debugError } from '../debuggers';
import redis from '../redis';

export default async function userMiddleware(
  req: Request & { user?: any },
  _res: Response,
  next: NextFunction,
) {
  const subdomain = getSubdomain(req);

  if (!req.cookies) {
    return next();
  }

  const token = req.cookies['auth-token'];

  if (!token) {
    return next();
  }

  try {
    // verify user token and retrieve stored user information
    const { user }: any = jwt.verify(token, process.env.JWT_TOKEN_SECRET || '');

    const userDoc = await sendMessage({
      serviceName: 'core',
      subdomain,
      action: 'users.findOne',
      data: {
        _id: user._id,
      },
      isRPC: true,
    });

    if (!userDoc) {
      debugError(`auth failed: user not found (userId: ${user._id})`);
      return next();
    }

    const validatedToken = await redis.get(`user_token_${user._id}_${token}`);

    // invalid token access.
    if (!validatedToken) {
      debugError(
        `auth failed: token not validated in redis, likely invalidated by a newer login (userId: ${user._id})`,
      );
      return next();
    }

    // save user in request
    req.user = user;
    req.user.loginToken = token;
    req.user.sessionCode = req.headers.sessioncode || '';

    const currentDate = new Date();
    const machineId: string = telemetry.getMachineId();

    const lastLoginDate = new Date((await redis.get(machineId)) || '');

    if (lastLoginDate.getDay() !== currentDate.getDay()) {
      redis.set(machineId, currentDate.toJSON());

      telemetry.trackCli('last_login', { updatedAt: currentDate });
    }

    const hostname = await redis.get('hostname');

    if (!hostname) {
      redis.set('hostname', process.env.DOMAIN || 'http://localhost:3000');
    }
  } catch (e) {
    if (e.name === 'TokenExpiredError') {
      debugError(`auth failed: token expired at ${e.expiredAt}`);
    } else {
      debugError(`auth failed: ${e.name} - ${e.message}`);
    }
  }

  return next();
}
