import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis | undefined }

const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379', {
    maxRetriesPerRequest: 3,
    enableReadyCheck: false,
    lazyConnect: true,
  })

redis.on('error', (err: Error) => {
  console.error('[Redis] Connection error:', err.message)
})

if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis
}

export default redis
