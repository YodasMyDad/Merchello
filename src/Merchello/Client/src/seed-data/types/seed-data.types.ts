export interface SeedDataStatusDto {
  isEnabled: boolean;
  isInstalled: boolean;
}

export interface InstallSeedDataResultDto {
  success: boolean;
  isInstalled: boolean;
  message: string;
}
