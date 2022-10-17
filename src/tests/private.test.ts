import Server from '../server';
import { Utils } from './utils';

jest.retryTimes(parseInt(process.env.RETRY_TIMES || '1'));

describe('private channel test', () => {
    beforeEach(() => {
        jest.resetModules();
        return Utils.waitForPortsToFreeUp();
    });

    afterEach(() => {
        return Utils.flushServers();
    });

    it('connects to private channel', done => {
        Utils.newServer({}, (server: Server) => {
            let client = Utils.newClientForPrivateChannel();
            let backend = Utils.newBackend();
            let channelName = `private-${Utils.randomChannelName()}`;

            client.connection.bind('connected', () => {
                let channel = client.subscribe(channelName);

                channel.bind('greeting', e => {
                    expect(e.message).toBe('hello');
                    client.disconnect();
                    done();
                });

                channel.bind('pusher:subscription_succeeded', () => {
                    backend.trigger(channelName, 'greeting', { message: 'hello' })
                        .catch(error => {
                            throw new Error(error);
                        });
                });
            });
        });
    });

    it('cannot connect to private channel with wrong authentication', done => {
        Utils.newServer({}, (server: Server) => {
            let client = Utils.newClientForPrivateChannel({
                authorizer: (channel, options) => ({
                    authorize: (socketId, callback) => {
                        callback(false, {
                            auth: 'incorrect_token',
                            channel_data: null,
                        });
                    },
                }),
            });

            let channelName = `private-${Utils.randomChannelName()}`;

            client.connection.bind('message', ({ event, channel, data }) => {
                if (event === 'pusher:subscription_error' && channel === channelName) {
                    expect(data.type).toBe('AuthError');
                    expect(data.status).toBe(401);
                    client.disconnect();
                    done();
                }
            });

            client.connection.bind('connected', () => {
                client.subscribe(channelName);
            });
        });
    });

    it('connects and disconnects to private channel and does not leak memory', done => {
        Utils.newServer({}, (server: Server) => {
            let client = Utils.newClientForPrivateChannel();
            let backend = Utils.newBackend();
            let channelName = `private-${Utils.randomChannelName()}`;

            client.connection.bind('disconnected', () => {
                Utils.wait(3000).then(() => {
                    let namespace = server.websocketsNode.namespace('app-id');

                    expect(namespace.sockets.size).toBe(0);
                    expect(namespace.channels.size).toBe(0);
                    done();
                });
            });

            client.connection.bind('connected', () => {
                let channel = client.subscribe(channelName);

                channel.bind('greeting', e => {
                    expect(e.message).toBe('hello');

                    client.unsubscribe(channelName);

                    Utils.wait(3000).then(() => {
                        let namespace = server.websocketsNode.namespace('app-id');
                        let socket = namespace.sockets.get(namespace.sockets.keys().next().value);

                        expect(namespace.channels.size).toBe(0);
                        expect(namespace.sockets.size).toBe(1);
                        expect(socket?.subscribedChannels?.size).toBe(0);
                        expect(socket?.presence?.size).toBe(0);

                        client.disconnect();
                    });
                });

                channel.bind('pusher:subscription_succeeded', () => {
                    backend.trigger(channelName, 'greeting', { message: 'hello' });
                });
            });
        });
    });

    it('sudden close connection in private channel and does not leak memory', done => {
        Utils.newServer({}, (server: Server) => {
            let client = Utils.newClientForPrivateChannel();
            let backend = Utils.newBackend();
            let channelName = `private-${Utils.randomChannelName()}`;

            client.connection.bind('disconnected', () => {
                Utils.wait(3000).then(() => {
                    let namespace = server.websocketsNode.namespace('app-id');

                    expect(namespace.sockets.size).toBe(0);
                    expect(namespace.channels.size).toBe(0);
                    done();
                });
            });

            client.connection.bind('connected', () => {
                let channel = client.subscribe(channelName);

                channel.bind('greeting', e => {
                    expect(e.message).toBe('hello');
                    client.disconnect();
                });

                channel.bind('pusher:subscription_succeeded', () => {
                    backend.trigger(channelName, 'greeting', { message: 'hello' });
                });
            });
        });
    });

    it('cached private channels work', done => {
        Utils.newServer({}, (server: Server) => {
            let client1 = Utils.newClientForPrivateChannel();
            let backend = Utils.newBackend();
            let channelName = `private-cache-${Utils.randomChannelName()}`;

            client1.connection.bind('connected', () => {
                let channel = client1.subscribe(channelName);

                channel.bind('pusher:subscription_succeeded', () => {
                    channel.bind('greeting', e => {
                        expect(e.message).toBe('hello');

                        let client2 = Utils.newClientForPrivateChannel();

                        client2.connection.bind('connected', () => {
                            let channel = client2.subscribe(channelName);

                            channel.bind('pusher:cache_miss', ({ event, data }) => {
                                expect(event).toBe('greeting');
                                expect(data).toBe(JSON.stringify({ message: 'hello'}));

                                client1.disconnect();
                                client2.disconnect();
                                done();
                            });
                        });
                    });

                    backend.trigger(channelName, 'greeting', { message: 'hello' }).catch(error => {
                        throw new Error(error);
                    });
                });
            });
        });
    });

    Utils.shouldRun({ appManager: 'array' })('user authentication works if conn immediately joins a private channel', (done) => {
        Utils.newServer({ 'websockets.appManagers.drivers.array.apps.0.enableUserAuthentication': true, 'userAuthenticationTimeout': 5_000 }, (server: Server) => {
            let client = Utils.newClientForPrivateChannel();
            let channelName = `private-${Utils.randomChannelName()}`;

            client.connection.bind('connected', () => {
                let channel = client.subscribe(channelName);

                channel.bind('pusher:subscription_succeeded', () => {
                    // After subscription, wait 10 seconds to make sure it isn't disconnected
                    setTimeout(() => {
                        client.disconnect();
                        done();
                    }, 10_000);
                });
            });
        });
    });
});
