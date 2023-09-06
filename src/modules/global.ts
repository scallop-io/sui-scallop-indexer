import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ScallopAddress, ScallopClient } from '@scallop-io/sui-scallop-sdk';
import { NetworkType, SuiKit } from '@scallop-io/sui-kit';
import { ConfigInterface } from 'src/app.config';
import { formatDate, consoleColors } from 'src/utils/common';

@Global()
@Module({
  providers: [
    {
      provide: ScallopAddress,
      useFactory: async (configService: ConfigService<ConfigInterface>) => {
        const configNetwork = configService.get('network', { infer: true });
        const configScallopApi = configService.get('scallopApi', {
          infer: true,
        });

        const addresses = new ScallopAddress({
          id: configScallopApi.addressesId,
          auth: configScallopApi.key,
          network: configNetwork.cluster as NetworkType,
        });

        try {
          await addresses.read();
        } catch (e) {
          console.error(
            `${consoleColors.fg.red}[System] - ${
              consoleColors.reset
            }${formatDate(new Date())} ${consoleColors.fg.red}Error ${
              consoleColors.fg.yellow
            }[modules.addresses] ${
              consoleColors.fg.red
            }Failed to read addresses${consoleColors.reset}`,
          );
        }

        return addresses;
      },
      inject: [ConfigService],
    },
    {
      provide: ScallopClient,
      useFactory: (
        configService: ConfigService<ConfigInterface>,
        scallopAddress: ScallopAddress,
      ) => {
        const configNetwork = configService.get('network', { infer: true });

        return new ScallopClient(
          {
            fullnodeUrls: [configNetwork.enpoint],
            networkType: configNetwork.cluster as NetworkType,
          },
          scallopAddress,
        );
      },
      inject: [ConfigService, ScallopAddress],
    },
    {
      provide: SuiKit,
      useFactory: (configService: ConfigService<ConfigInterface>) => {
        const configNetwork = configService.get('network', { infer: true });

        return new SuiKit({
          fullnodeUrls: [configNetwork.enpoint],
          networkType: configNetwork.cluster as NetworkType,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [ScallopAddress, ScallopClient, SuiKit],
})
export class GlobalModule {}
