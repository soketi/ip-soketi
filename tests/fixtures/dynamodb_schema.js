import AWS from 'aws-sdk';

let ddb = new AWS.DynamoDB({
    apiVersion: '2012-08-10',
    region: 'us-east-1',
    endpoint: 'http://dynamodb:8000',
});

let createRecord = () => {
    const params = {
        TableName: 'apps',
        Item: {
            AppId: { S: 'app-id' },
            AppKey: { S: 'app-key' },
            AppSecret: { S: 'app-secret' },
            MaxConnections: { N: '-1' },
            EnableClientMessages: { B: 'false' },
            EnableUserAuthentication: { B: 'false' },
            Enabled: { B: 'true' },
            MaxBackendEventsPerSecond: { N: '-1' },
            MaxClientEventsPerSecond: { N: '-1' },
            MaxReadRequestsPerSecond: { N: '-1' },
            Webhooks: { S: '[]', },
            MaxPresenceMembersPerChannel: { N: '200' },
            MaxPresenceMemberSizeInKb: { N: '200' },
            MaxChannelNameLength: { N: '200' },
            MaxEventChannelsAtOnce: { N: '200' },
            MaxEventNameLength: { N: '200' },
            MaxEventPayloadInKb: { N: '200' },
            MaxEventBatchSize: { N: '200' },
        },
    };

    return ddb.putItem(params).promise().then(() => {
        console.log('Record created.');
    }).catch(err => {
        console.error(err);
        console.log('Record already existent.');
    });
};

ddb.describeTable({ TableName: 'apps' }).promise().then((result) => {
    createRecord();
}).catch(err => {
    console.error(err);

    ddb.createTable({
        TableName: 'apps',
        AttributeDefinitions: [
            {
                AttributeName: 'AppId',
                AttributeType: 'S',
            },
            {
                AttributeName: 'AppKey',
                AttributeType: 'S',
            },
        ],
        KeySchema: [{
            AttributeName: 'AppId',
            KeyType: 'HASH',
        }],
        GlobalSecondaryIndexes: [{
            IndexName: 'AppKeyIndex',
            KeySchema: [{
                AttributeName: 'AppKey',
                KeyType: 'HASH',
            }],
            Projection: {
                ProjectionType: 'ALL',
            },
            ProvisionedThroughput: {
                ReadCapacityUnits: 100,
                WriteCapacityUnits: 100,
            },
        }],
        StreamSpecification: {
            StreamEnabled: false,
        },
        ProvisionedThroughput: {
            ReadCapacityUnits: 100,
            WriteCapacityUnits: 100,
        },
    }).promise().then(() => {
        console.log('Table created.');
    }).then(createRecord).catch((err) => {
        console.error(err);
        console.log('Table already existent.');
    });
});
