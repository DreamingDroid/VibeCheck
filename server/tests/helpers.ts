import request from 'supertest';
import { app } from '../src/index';
import { config } from '../src/config';

export function createApiClient() {
  const agent = request(app);
  return {
    get: (url: string) => {
      const req = agent.get(url);
      if (config.PRIVATE_BACKEND_TOKEN) {
        req.set('Authorization', `Bearer ${config.PRIVATE_BACKEND_TOKEN}`);
      }
      return req;
    },
    post: (url: string) => {
      const req = agent.post(url);
      if (config.PRIVATE_BACKEND_TOKEN) {
        req.set('Authorization', `Bearer ${config.PRIVATE_BACKEND_TOKEN}`);
      }
      return req;
    },
    put: (url: string) => {
      const req = agent.put(url);
      if (config.PRIVATE_BACKEND_TOKEN) {
        req.set('Authorization', `Bearer ${config.PRIVATE_BACKEND_TOKEN}`);
      }
      return req;
    },
    delete: (url: string) => {
      const req = agent.delete(url);
      if (config.PRIVATE_BACKEND_TOKEN) {
        req.set('Authorization', `Bearer ${config.PRIVATE_BACKEND_TOKEN}`);
      }
      return req;
    }
  };
}
