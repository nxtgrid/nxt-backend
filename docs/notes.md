# Notes

## camelCase vs snake_case in API surface
The new `nxt-device-messaging service` API is fully specced in camelCase.
The backend has always favored snake_case, particularly because of directly handling Postgres properties.
Can we make an informed decision whether/where to translate API I/O for `nxt-device-messaging`?

## Learning from Skyfox's device-messaging-client
Skyfox now has a (rather elaborate) client wrapper for `nxt-device-messaging`.
Can we learn (copy) from that so we don't have to build from scratch?

## Zod validation in nxt-backend?
