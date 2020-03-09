class ServiceRegister {
    constructor() {
        this.services = {};
    }
    getService(name){
        return this.services[name];
    }
}
export default ServiceRegister;


