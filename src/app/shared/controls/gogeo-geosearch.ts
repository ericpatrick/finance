module gogeo {
  export class GogeoGeosearch {

    private requestData: any = {};

    geom: IGeom = null;
    buffer: number = 0;
    measure_buffer: string = null;
    q: any = {};
    limit: number = 0;
    fields: Array<string> = [];

    constructor(
      private $http: ng.IHttpService,
      geom: IGeom,
      buffer: number,
      measure_buffer: string,
      fields: Array<string>,
      limit: number,
      query?: any) {

      this.geom = geom;
      this.buffer = buffer;
      this.measure_buffer = measure_buffer;
      this.fields = fields;
      this.limit = limit;
      this.q = angular.toJson(query);
    }

    execute(resultHandler: (ITransaction) => void) {
      var url = Configuration.makeUrl("geosearch/" + Configuration.getDatabaseName() + "/" + Configuration.getCollectionName() + "?mapkey=123");

      this.requestData = {
        geom: this.geom,
        limit: this.limit,
        buffer: this.buffer,
        measure_buffer: this.measure_buffer,
        fields: this.fields,
        q: this.q
      }

      return this.$http
        .post<Array<ITransaction>>(url, this.requestData)
        .success(resultHandler);
    }

  }
}