class ServiceRegister {
    constructor() {
        this.services = {};
    }
    getService(name){
        return this.services[name];
    }
    async waitRegister(type){

    }
}
export default ServiceRegister;


