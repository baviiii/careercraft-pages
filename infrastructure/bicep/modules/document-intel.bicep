@description('Document Intelligence account name')
param accountName string

@description('Location for resources')
param location string = 'australiaeast'

@description('Environment name')
param environment string

@description('Project name')
param projectName string

// Document Intelligence (Form Recognizer) - S0 tier for cost optimization
resource docIntelAccount 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: accountName
  location: location
  kind: 'FormRecognizer'
  sku: {
    name: 'S0'
  }
  properties: {
    apiProperties: {}
    customSubDomainName: accountName
    publicNetworkAccess: 'Enabled'
  }
  tags: {
    Environment: environment
    Project: projectName
    ManagedBy: 'Bicep'
    CostCenter: 'RAG-Infrastructure'
  }
}

output endpoint string = docIntelAccount.properties.endpoint
output key string = docIntelAccount.listKeys().key1
output accountName string = accountName
output region string = location
