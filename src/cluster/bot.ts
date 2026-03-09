import { Manager } from '../manager.js'
import { ConfigDataService } from '../services/ConfigDataService.js'
import { ClusterManager } from './core.js'

export function bootBot(clusterManager?: ClusterManager) {
  const configData = new ConfigDataService().data
  const tainy = new Manager(configData, configData.utilities.MESSAGE_CONTENT.enable, clusterManager)

  // Anti crash handling
  process
    .on('unhandledRejection', (error) => tainy.logger.unhandled('AntiCrash', error))
    .on('uncaughtException', (error) => tainy.logger.unhandled('AntiCrash', error))
    .on('uncaughtExceptionMonitor', (error) => tainy.logger.unhandled('AntiCrash', error))
    .on('exit', () =>
      tainy.logger.info('ClientManager', `Successfully Powered Off tainy, Good Bye!`)
    )
    .on('SIGINT', () => {
      tainy.logger.info('ClientManager', `Powering Down tainy...`)
      process.exit(0)
    })

  tainy.start()
}
