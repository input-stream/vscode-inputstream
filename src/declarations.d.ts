declare namespace api {
    interface Client {
        listApiKeys(login: string): Promise<any>;
    }
    function newClient(token: string): Client;
}