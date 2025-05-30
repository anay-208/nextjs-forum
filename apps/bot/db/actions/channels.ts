import { db } from '@nextjs-forum/db'
import { channelsCache } from '../../lib/cache.ts'
import { type Channel, ChannelType } from 'discord.js'
import { baseLog } from '../../log.ts'
import { isMessageInForumChannel } from '../../utils.ts'

const log = baseLog.extend('channels')

export const syncMessageChannel = async (messageChannel: Channel) => {
  if (!isMessageInForumChannel(messageChannel) || !messageChannel.parent) return
  const mainChannel = messageChannel.parent

  if (
    mainChannel.type !== ChannelType.GuildForum &&
    mainChannel.type !== ChannelType.GuildText
  ) {
    return
  }

  await syncChannel(mainChannel)
}

export const syncChannel = async (channel: Channel) => {
  const isCached = channelsCache.get(channel.id)
  if (isCached) return

  const isGuildBasedChannel = 'guild' in channel
  if (!isGuildBasedChannel) return

  const topic = 'topic' in channel ? channel.topic : null

  await db
    .insertInto('channels')
    .values({
      snowflakeId: channel.id,
      name: channel.name,
      type: channel.type,
      topic: topic ?? '',
    })
    .onConflict((oc) =>
      oc.column('snowflakeId').doUpdateSet({
        name: channel.name,
        topic: topic ?? '',
      }),
    )
    .executeTakeFirst()

  log('Synced channel (#%s)', channel.name)
  channelsCache.set(channel.id, true)
}
