class ServiceRegister {
    constructor() {
        this.services = {};
    }
    getService(name) {
        return this.services[name];
    }
    addService(name, service) {
        this.services[name] = service;
    }

    async waitRegister(type) {

    }
}
export default ServiceRegister;