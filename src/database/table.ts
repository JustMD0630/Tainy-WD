import { IDriver, QuickDB } from 'dreamvast.quick.db'
import { Manager } from '../manager.js'
import { Handler } from './handler.js'
// Schema
import { AutoReconnect } from './schema/AutoReconnect.js'
import { Playlist } from './schema/Playlist.js'
import { Code } from './schema/Code.js'
import { Premium } from './schema/Premium.js'
import { Setup } from './schema/Setup.js'
import { Language } from './schema/Language.js'
import { Prefix } from './schema/Prefix.js'
import { SongNoti } from './schema/SongNoti.js'
import { QuickDatabasePlus } from '../structures/QuickDatabasePlus.js'
import Blacklist from '../commands/Owner/Blacklist.js'
import { MaxLength } from './schema/MaxLength.js'
import { Comment } from './schema/Comment.js'
import { Report } from './schema/Report.js'
import { UserData } from './schema/User.js'
import { Notification } from './schema/Notification.js'
import { Relationship } from './schema/Relationship.js'

export class TableSetup {
  client: Manager
  driver: IDriver
  driverName: string
  constructor(client: Manager, driver: IDriver, driverName: string) {
    this.client = client
    this.driver = driver
    this.driverName = driverName
    this.register()
  }

  async register() {
    const baseDB = new QuickDatabasePlus(this.client.config.utilities.DATABASE.cacheCleanSchedule, {
      driver: this.driver,
    })

    const start = Date.now()
    await baseDB.init()
    const end = Date.now()

    this.client.logger.info(
      'DatabaseService',
      `Connected to the database! [${this.driverName}] [${end - start}ms]`
    )

    this.client.db = {
      autoreconnect: await baseDB.table<AutoReconnect>('autoreconnect'),
      playlist: await baseDB.table<Playlist>('playlist'),
      comment: await baseDB.table<Comment>('comment'),
      report: await baseDB.table<Report>('report'),
      user: await baseDB.table<UserData>('user'),
      notification: await baseDB.table<Notification>('notification'),
      relationship: await baseDB.table<Relationship>('relationship'),
      code: await baseDB.table<Code>('code'),
      premium: await baseDB.table<Premium>('premium'),
      setup: await baseDB.table<Setup>('setup'),
      language: await baseDB.table<Language>('language'),
      prefix: await baseDB.table<Prefix>('prefix'),
      songNoti: await baseDB.table<SongNoti>('songNoti'),
      preGuild: await baseDB.table<Premium>('preGuild'),
      blacklist: await baseDB.table<Blacklist>('blacklist'),
      maxlength: await baseDB.table<MaxLength>('maxlength'),
    }

    this.client.isDatabaseConnected = true
    new Handler(this.client)
  }
}
