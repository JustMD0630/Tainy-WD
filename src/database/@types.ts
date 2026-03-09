import { AutoReconnect } from './schema/AutoReconnect.js'
import { Playlist } from './schema/Playlist.js'
import { Code } from './schema/Code.js'
import { Premium } from './schema/Premium.js'
import { Setup } from './schema/Setup.js'
import { Language } from './schema/Language.js'
import { Prefix } from './schema/Prefix.js'
import { SongNoti } from './schema/SongNoti.js'
import { QuickDatabasePlus } from '../structures/QuickDatabasePlus.js'
import { GuildPremium } from './schema/GuildPremium.js'
import Blacklist from '../commands/Owner/Blacklist.js'
import { MaxLength } from './schema/MaxLength.js'
import { Comment } from './schema/Comment.js'
import { Report } from './schema/Report.js'
import { UserData } from './schema/User.js'
import { Notification } from './schema/Notification.js'
import { Relationship } from './schema/Relationship.js'

export interface DatabaseTable {
  autoreconnect: QuickDatabasePlus<AutoReconnect>
  playlist: QuickDatabasePlus<Playlist>
  comment: QuickDatabasePlus<Comment>
  report: QuickDatabasePlus<Report>
  user: QuickDatabasePlus<UserData>
  notification: QuickDatabasePlus<Notification>
  relationship: QuickDatabasePlus<Relationship>
  code: QuickDatabasePlus<Code>
  premium: QuickDatabasePlus<Premium>
  preGuild: QuickDatabasePlus<GuildPremium>
  setup: QuickDatabasePlus<Setup>
  language: QuickDatabasePlus<Language>
  prefix: QuickDatabasePlus<Prefix>
  songNoti: QuickDatabasePlus<SongNoti>
  blacklist: QuickDatabasePlus<Blacklist>
  maxlength: QuickDatabasePlus<MaxLength>
}
