import { Injectable } from '@angular/core';
import { HttpBackend } from '@angular/common/http';
import { HttpClient } from 'selenium-webdriver/http';

@Injectable({
  providedIn: 'root'
})
export class ServicesWpsService {

  constructor() { }
}


type TOutput = {'identifier':any, 'title':any, 'complexOutput':any, 'literalOutput':any, 'boundingBoxOutput':any, 'data':any};
type TInput = {'minOccurs':any, 'maxOccurs':any, 'identifier':any, 'title':any, '_abstract':any, 'complexData':any, 'literalData':any, 'boundingBoxData':any};

interface IWpsSvc {
   baseUrl: string;
   getCapabilities(url: string, callback: Function)
   parseCapabilities(capabilities)
   parseProcessOfferings(offerings:Array<any>)
   parseOffering(offering)
   parseOperations(operations)
   parseServiceIdentification(serviceIdentification)
   parseServiceProvider(serviceProvider)
   describeProcess(url, processIdentifier, callback)
   parseDescribeProcess(descripion)
   parseProcessDescriptions(array)
   parseDescription(descripions)
   parseProcessInputs(array):Array<TInput>
   parseProcessOutputs(array):Array<TOutput>
   parseOutput(output)
   parseInput(input)
   parseComplexData(data)
   parseLiteralData(data)
   executeProcess(url, processIdentifier, body, responseFormType, callback)
   dismissProcess(url:string, executionId:string, callback:Function)
   createInputBody(scopeModel)
   createOutputsBody(scopeModel, template)
   createResponseFormBody(scopeModel, responseForm)
   createExecuteBody(scopeInputModel, scopeOutputModel, processIdentifier, responseForm)
   parseExecuteResponse(executeInfo)
   parseExceptionReport(processFailed)
   requestStatus(statusLocation, callback)
   getExecutionResult(url, callback)
   responeException(response)
}


class WpsHelperSvc  {

  objHasKeys(obj, keys) {
      var next = keys.shift();
      return obj[next] && (!keys.length || this.objHasKeys(obj[next], keys));
  }

  buildQuery(obj) {
      var query = "?";
      for (var k in obj) {
          query += k + "=" + obj[k] + "&";
      }
      //TODO: uri encode proposed in RFC not working with Django-AS
      query = query.substr(0, query.length - 1);
      return query;
  }

  parseUrl(url) {
      //var parser = document.createElement('a'); //parser.href = url;
      var _url: Array<string> = decodeURIComponent(url).split('?');
      var parser = {
          url: _url[0],
          queryParams: {}
      };

      var repCallback = ($0, $1, $2, $3) => {
          return parser.queryParams[$1] = $3;
      }
      _url[1].replace(new RegExp("([^?=&]+)(=([^&]*))?", "g"), repCallback);

      return parser;
  }

  getArrayFromArrayObjects(formats:any, key:string):any {
    //console.log(formats)
    return formats.map((obj):any => {
          return obj[key];
      })

  }

  jsonixTime2Date(time) {
      //year, month, day, hour, minute, second, fractionalSecond, timezone
      let timeFract: any = time.fractionalSecond * 1000;
      var date = new Date(time.year, time.month - 1, time.day, time.hour + 1, time.minute, time.second, parseInt(timeFract));
      /*
      var options = {
          weekday: "long",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
      };

      var dateString = date.toLocaleTimeString("de-de", options);
      */
      var dateString = date.toUTCString();
      return dateString;
  }
}


class WpsSchemaSvc {

  WpsHelperSvc: WpsHelperSvc;

  constructor() {
    this.WpsHelperSvc = new WpsHelperSvc();
  }

  processOutputs2schema(array): any {
    var len, o = 0,
      parsedOutput;
    len = array.length;

    var _outputSchem = {
      type: "object",
      title: "Outputs",
      required: [],
      properties: {}
    };

    for (o; o < len; o++) {
      parsedOutput = array[o];
      this.processOutput2schema(parsedOutput, _outputSchem);
    }

    return _outputSchem;
  }

  // build schema for Inputform
  processOutput2schema(description, _schema) {
    var _output, _value, _complexOutput, _literalOutput, inputRequired: any = false;

    _output = {
      description: "",
      type: "object",
      title: "",
      required: [],
      properties: {}
    };

    if (this.WpsHelperSvc.objHasKeys(description, ['identifier'])) {
      ////console.log('use title for form-output titel!')
      _output.title = description.title || description.identifier;
      //_output.title = description.identifier;



      if (this.WpsHelperSvc.objHasKeys(description, ['_abstract'])) {
        _output.description = description._abstract;
      }


      this.processComplexOutput2schema(description, _complexOutput, _output);
      this.processLiteralOutput2schema(description, _value, _literalOutput, _output, inputRequired);


      //push input in schema
      _schema.properties[_output.title] = _output;
    }



  }


  processComplexOutput2schema(description, _complexOutput, _output, ) {
    if (this.WpsHelperSvc.objHasKeys(description, ['complexOutput'])) {
      //TODO: output as other model and get identifier==key value=Form.value and mimeType=Form.mimeType
      //on Change to response doc show checkbox for other values
      _complexOutput = {
        type: "object",
        "x-schema-form": {
          "type": "section"
        },
        required: [],
        properties: {
          identifier: { //only for mapping because the title should not be the identifier
            type: "hidden",
            default: description.identifier
          },
          mimeType: {
            title: 'mimeType',
            type: "string",
            enum: this.WpsHelperSvc.getArrayFromArrayObjects(description.complexOutput.supported, 'mimeType'),
            "default": description.complexOutput._default.mimeType
          }
        }
      }

      _output.properties['complexOutput'] = _complexOutput;
    }
  }

  processLiteralOutput2schema(description, _value, _literalOutput, _output, inputRequired) {
    if (this.WpsHelperSvc.objHasKeys(description, ['literalOutput'])) {
      let formTitle = '';

      if (this.WpsHelperSvc.objHasKeys(description, ['literalOutput', 'allowedValues'])) {
        _value = {
          title: formTitle,
          type: "string",
          enum: description.literalOutput.allowedValues
        }
      } else {

        if (this.WpsHelperSvc.objHasKeys(description, ['literalOutput', 'dataType'])) {
          switch (description.literalOutput.dataType) {
            case "integer":
              description.literalOutput.defaultValue = parseInt(description.literalOutput.defaultValue)
              break;
            case "number":
              description.literalOutput.defaultValue = Number(description.literalOutput.defaultValue)
              break;
          }
        }

        /*
        _value = {
            title: 'value',
            type: description.literalOutput.dataType || "string",
            "default": description.literalOutput.defaultValue
        }
        */
        _value = this.outputMimeTypeToLiteralValueForm(description);//_value;
      }


      _literalOutput = {
        type: "object",
        "x-schema-form": {
          "type": "section",
          key: "value",
          condition: "true",
        },
        required: [],
        properties: {
          identifier: { //only for mapping because the title should not be the identifier
            type: "hidden",
            default: description.identifier
          },
          value: _value
        }
      }

      if (inputRequired === true) {
        _literalOutput.required.push('value')
      }


      _output.properties['literalOutput'] = _literalOutput;

    }
  }
  //----------------------------------------------------------------------

  processInputs2schema(array): any {
    var len, o = 0,
      parsedOutput;
    len = array.length;

    var _inputSchema = {
      type: "object",
      title: "Inputs",
      required: [],
      properties: {}
    };

    for (o; o < len; o++) {
      parsedOutput = array[o];
      this.processInput2schema(parsedOutput, _inputSchema);
    }

    return _inputSchema;
  }

  // build schema for Inputform
  processInput2schema(description, _schema): any {
    var _input, _complexData, _literalData, _value, inputRequired: any = false;

    _input = {
      description: "",
      type: "object",
      title: "",
      identifier: "",
      required: [],
      properties: {
        //literalData: null
      }
    };

    if (this.WpsHelperSvc.objHasKeys(description, ['identifier'])) {
      ////console.log('use title for form-input titel in!')
      _input.title = description.title || description.identifier;

      if (this.WpsHelperSvc.objHasKeys(description, ['minOccurs'])) {
        if (description.minOccurs > 0) {
          inputRequired = true;
          _schema.required.push(_input.title)
        }
      }


      if (this.WpsHelperSvc.objHasKeys(description, ['_abstract'])) {
        _input.description = description._abstract;
      }

      this.processComplexInput2schema(description, _complexData, _input, inputRequired);
      this.processLiteraInput2schema(description, _literalData, _value, _input, inputRequired);

      //push input in schema
      _schema.properties[_input.title] = _input;
    }


    return _schema;
  }

  processLiteraInput2schema(description, _literalData, _value, _input, inputRequired) {
    //https://github.com/json-schema-form/angular-schema-form/blob/development/docs/index.md
    if (this.WpsHelperSvc.objHasKeys(description, ['literalData'])) {
      let formTitle = '';
      //console.log('--- literal', description)

      //define the Input as FormType Section with a Title, description and push the input forms in tzhe properties obj
      _literalData = {
        "type": "object",
        "x-schema-form": {
          "type": "section",
          "key": "value",
          "condition": "true",
        },
        "required": [], //"required": ['value', 'dataType'],
        "properties": {
        }
      }

      if (this.WpsHelperSvc.objHasKeys(description, ['literalData', 'allowedValues'])) {
        _value = {
          title: formTitle,
          type: "string",
          enum: description.literalData.allowedValues,
          default: (description.literalData.defaultValue) ? description.literalData.defaultValue : ''
        }

        _literalData.properties['value'] = _value;
      } else { // specific data types of literal data - integer, number,...

        if (this.WpsHelperSvc.objHasKeys(description, ['literalData', 'dataType'])) {

          _literalData.properties['dataType'] = {
            value: description.literalData.dataType, //to send correct dataType with ExecuteRequest
            default: description.literalData.dataType, //to send correct dataType with ExecuteRequest

            //set formType for show dataType
            type: "hidden", // "string",
            "x-schema-form": {
              "type": "text" //section
            }
          }
          //------------------------------------------
        }

        _literalData.properties['value'] = this.inputMimeTypeToLiteralValueForm(description);//_value;
      }


      //-----------------------------
      _literalData.properties['identifier'] = { //only for mapping because the title should not be the identifier
        type: "hidden",
        default: description.identifier
      };

      if (inputRequired === true) {
        _literalData.required.push('value')
      }

      _input.properties['literalData'] = _literalData;
    }
  }

  /**
  * var type = description.literalData.dataType;
  */
  inputMimeTypeToLiteralValueForm(description) {
    var formTitle = '';
    var type = description.literalData.dataType;
    var form = this.getFormTypeFromMimeType(type);
    console.log('>>> form', form);

    if (form && form.type && description.literalData.defaultValue) {
      switch (form.type) {
        case "integer":
          description.literalData.defaultValue = parseInt(description.literalData.defaultValue)
          break;
        case "number":
          description.literalData.defaultValue = Number(description.literalData.defaultValue)
          break;
      }
    }

    if (!form) {
      //console.log(`no form for the type:${type} defined !!!!!`, description)
      form = {
        title: formTitle,
        type: "string",
        //default: (description.literalData.defaultValue)? description.literalData.defaultValue: ''
      }
    }

    form.title = formTitle;
    if (description.literalData.defaultValue == 'null') {
      description.literalData.defaultValue = '';
    }
    form.default = (description.literalData.defaultValue) ? description.literalData.defaultValue : ''

    return form;
  }

  /**
  * var type = description.complexData._default.mimeType
  */
  inputMimeTypeToComplexValueForm(description) {
    var formTitle = ''
    var type = description.complexData._default.mimeType
    var form = this.getFormTypeFromMimeType(type);
    console.log('>>> form', form);

    if (!form) {
      //console.log(`no form for the type:${type} defined !!!!!`, description)
      form = {
        title: formTitle,
        type: "string",
        //default: (description.complexData.defaultValue)? description.complexData.defaultValue: ''
      }
    }

    form.title = formTitle;
    if (description.complexData.defaultValue == 'null') {
      description.complexData.defaultValue = '';
    }
    form.default = (description.complexData.defaultValue) ? description.complexData.defaultValue : ''

    return form;
  }

  outputMimeTypeToLiteralValueForm(description) {
    var formTitle = ''
    var type = description.literalOutput.dataType;
    var form = this.getFormTypeFromMimeType(type);
    //console.log('>>> form',form);

    if (!form) {
      //console.log(`no form for the type:${type} defined !!!!!`, description)
      form = {
        title: formTitle,
        type: "string",
        default: (description.literalOutput.defaultValue) ? description.literalOutput.defaultValue : ''
      }
    }

    form.title = formTitle;
    form.default = (description.literalOutput.defaultValue) ? description.literalOutput.defaultValue : ''

    return form;
  }

  mimeTypeToComplexValueForm(description, type) {
    /*
    return  {
        title: 'value',
        //type: description.literalData.dataType || "string",
        type: this.getFormTypeForDataType(type) || "string",
        'x-schema-form': this.getFormTypeFromMimeType(type)['x-schema-form'],
        default: (description.literalData.defaultValue)? description.literalData.defaultValue: ''
    }
    */
  }

  processComplexInput2schema(description, _complexData, _input, inputRequired) {
    if (this.WpsHelperSvc.objHasKeys(description, ['complexData'])) {
      let formTitle = '';
      //console.log('--- complex', description)
      ////console.log('//TODO get Default input value of complex data if possible');
      _complexData = {
        type: "object",
        "x-schema-form": {
          "type": "section"
        },
        required: ['mimeType', 'value'],
        properties: {
          identifier: { //only for mapping because the title should not be the identifier
            type: "hidden",
            default: description.identifier
          },
          value: {
            type: "string",
            title: formTitle,
            //"default": "", //TODO get Default input value of complex data if possible
            "x-schema-form": {
              "type": "textarea", //textarea
            }
          },
          mimeType: {

            //  "x-schema-form": {
            //  "key": "mimeType",
            //  "onChange": (modelValue, form)=>{
            //    form.description = getSchemaForMimeType(modelValue)
            //  }
            //  },
            title: 'mimeType',
            type: "string",
            enum: this.WpsHelperSvc.getArrayFromArrayObjects(description.complexData.supported, 'mimeType'),
            default: '',
            description: ''
          }
        }
      }
      if (description.complexData._default.mimeType) {
        _complexData.properties.mimeType.default = description.complexData._default.mimeType;

        //TODO get FormType from MimeType
        ////console.log('TODO get FormType from MimeType')
        ////console.log(description.complexData._default.mimeType)
        //_complexData.properties.value['x-schema-form'] = this.getFormTypeFromMimeType(description.complexData._default.mimeType)['x-schema-form'];
        _complexData.properties['value'] = this.inputMimeTypeToComplexValueForm(description);
        //console.log('#########',_complexData.properties.value)

      }


      if (this.WpsHelperSvc.objHasKeys(description, ['complexData', '_default', 'schema'])) {
        _complexData.properties.mimeType.description = description.complexData._default.schema;
      }

      ////console.log('processInput2schema complex', _complexData)

      _input.properties['complexData'] = _complexData;
      //console.log('### complex', _input)
    }
  }

  getFormTypeFromMimeType(mimeType: string): any {
    //console.log('%%% mimeType', mimeType)
    // form types https://github.com/json-schema-form/angular-schema-form/blob/development/docs/index.md#form-types
    //https://github.com/json-schema-form/json-schema-form/wiki/Documentation
    var _types = {
      geojsonpicker: {
        type: "string",
        format:'geojson'
        /*
        "x-schema-form": {
          type: "geojsonpicker"
        }
        */
        //validationMessage: 'Invaliv type, expected string format geoJSON',
      }
    }
    /**
    * http://swagger.io/specification/
    * JSON-Schema Draft 4
    */
    var _mimeTypes = {
      integer: {
        type: "integer",
        //format:"int32",
        //comment:"signed 32 bits"
      },
      long: {
        type: "integer",
        //format:"int64",
        //comment:"signed 64 bits"
      },
      float: {
        type: "number",
        //format:"float",
        //comment:""
      },
      double: {
        type: "number",
        //format:"double",
        //comment:""
      },
      string: {
        type: "string",
        //format:"",
        //comment:""
      },
      byte: {
        type: "string",
        //format:"byte",
        //comment:"base64 encoded characters"
      },
      binary: {
        type: "string",
        //format:"binary",
        //comment:"any sequence of octets"
      },
      boolean: {
        type: "boolean",
        //format:"",
        //comment:""
      },
      date: {
        type: "string",
        //format:"date",
        //comment:"As defined by full-date - RFC3339"
      },
      dateTime: {
        type: "string",
        //format:"date-time",
        //comment:"As defined by date-time - RFC3339"
      },
      password: {
        type: "string",
        //format:"password",
        //comment:"Used to hint UIs the input needs to be obscured"
      },
      //"application/octet-stream": _types.geojsonpicker,
      "application/vnd.geo+json": _types.geojsonpicker,
      "application/json": _types.geojsonpicker,
      "text/xml; subtype=gml/3.1.1": _types.geojsonpicker,
      //"text/xml; subtype=wfs-collection/1.0": _types.geojsonpicker,
      "xs:double": {
        type: "number",
        //format:"double",
        //comment:""
      },
      "int": {
        type: "integer",
        //format:"int32",
        //comment:"signed 32 bits"
      },
      "xs:int": {
        type: "integer",
        format:"int32",
        comment:"signed 32 bits"
      },
      "xs:float": {
        type: "number",
        //format:"float"
        //comment:""
      },
      "xs:long": {
        type: "integer",
        format:"int64",
        //comment:"signed 64 bits"
      },
      "xs:string": {
        type: "string",
        //format:"",
        //comment:""
      },
      "xs:boolean": {
        type: "boolean",
        //format:"",
        //comment:""
      },
      "xs:dateTime": {
        type: "string",
        format: 'datetime',
        validationMessage: 'Invaliv type, expected string format: YYYY-MM-DDTHH:mm:ss',
        //format:"date-time"
        //comment:"As defined by date-time - RFC3339"
      }

    }


    var formType = _mimeTypes[mimeType];

    //console.log('!!!! formType', formType)
    return formType;
  }


}


export class WpsSvc implements IWpsSvc {
  baseUrl: string;

  constructor(
    private WpsHelperSvc: WpsHelperSvc,
    private WpsSchemaSvc: WpsSchemaSvc,
    private http: HttpClient) {
      this.baseUrl = '../WPS/';
  }

  // getCapabilities ----------------------------------------------------------------------------
  // http://geoprocessing.info/wpsdoc/serv?request=HYPERLINKED&schema=wps:Capabilities
  getCapabilities(url: string) {
      var wpsQuery = {
          service: 'WPS',
          version: '1.0.0',
          request: 'GetCapabilities'
      };
      var pathUrl = url + this.WpsHelperSvc.buildQuery(wpsQuery)
      var wpsurl = encodeURIComponent(pathUrl);

      return this.http
  }

  //listAvailable = ['service', 'version', 'updateSequence', 'lang', 'serviceIdentification', 'serviceProvider', 'operationsMetadata', 'processOfferings', 'languages', 'wsdl'];
  parseCapabilities(capabilities) {
      var exception;
      var _capabilities: any = {
          strings: {},
          objects: {},
          processOfferings: null
      };

      exception = this.responeException(capabilities);
      if (exception === true) {
          _capabilities.strings.resopnse = "exception";
      } else {
          if (this.WpsHelperSvc.objHasKeys(capabilities, ['service'])) {
              _capabilities.strings.service = capabilities.service;
          }
          if (this.WpsHelperSvc.objHasKeys(capabilities, ['version'])) {
              _capabilities.strings.version = capabilities.version;
          }
          if (this.WpsHelperSvc.objHasKeys(capabilities, ['updateSequence'])) {
              _capabilities.strings.updateSequence = capabilities.updateSequence;
          }

          if (this.WpsHelperSvc.objHasKeys(capabilities, ['serviceIdentification'])) {
              _capabilities.objects.serviceIdentification = this.parseServiceIdentification(capabilities.serviceIdentification);
          }
          if (this.WpsHelperSvc.objHasKeys(capabilities, ['serviceProvider'])) {
              _capabilities.objects.serviceProvider = this.parseServiceProvider(capabilities.serviceProvider);
          }

          if (this.WpsHelperSvc.objHasKeys(capabilities, ['processOfferings', 'process'])) {
              _capabilities.processOfferings = capabilities.processOfferings.process;
          }
      }

      return _capabilities;
  }

  //parse offerings to get the getMap --------------
  // in case the results are available through WMS/WCS/WFS, the WPS Response Document may contain WMC/OWC inline that contains the server URL and layer/coverage/feature IDs
  parseProcessOfferings(offerings:Array<any>) {
      var _processOfferings: any = {};
      var _offering: any = null;

      for (var i = 0; i < offerings.length; i++) {
          _offering = this.parseOffering(offerings[i]);
          //_processOfferings[_offering.type] = _offering.code;
          _processOfferings[_offering.type] = _offering;
      }
      return _processOfferings;
  }

  parseOffering(offering) {
      var _offering: any = {};

      if (this.WpsHelperSvc.objHasKeys(offering, ['operations'])) {
          if (offering.code === 'http://www.opengis.net/spec/owc-geojson/1.0/req/wms') {
              _offering.type = 'wms';
              _offering.operations = this.parseOperations(offering.operations);
              //_offering.getMap = this.WpsHelperSvc.parseUrl(_offering.href);
          }

          if (offering.code === 'http://www.opengis.net/spec/owc-geojson/1.0/req/wcs') {
              _offering.type = 'wcs';
              _offering.operations = this.parseOperations(offering.operations);
          }

          if (offering.code === 'http://www.opengis.net/spec/owc-geojson/1.0/req/wfs') {
              _offering.type = 'wfs';
              _offering.operations = this.parseOperations(offering.operations);
          }

          return _offering;
      }

  }

  parseOperations(operations) {
      var _operations = {};
      for (var i = 0; i < operations.length; i++) {
          let _operation = {
            code: operations[i].code,
            href: operations[i].href,
            method: operations[i].method
          }

          _operations[operations[i].code] = _operation;
      }
      return _operations;
  }
  //--------------------------------------------------

  //listAvailable = ['title', '_abstract', 'keywords', 'serviceType', 'serviceTypeVersion', 'profile', 'fees', 'accessConstraints'];
  parseServiceIdentification(serviceIdentification) {
      var _serviceIdentification: any = {};

      if (this.WpsHelperSvc.objHasKeys(serviceIdentification, ['title'])) {
          _serviceIdentification.title = serviceIdentification.title[0].value;
      }
      if (this.WpsHelperSvc.objHasKeys(serviceIdentification, ['_abstract'])) {
          _serviceIdentification._abstract = serviceIdentification._abstract[0].value;
      }
      if (this.WpsHelperSvc.objHasKeys(serviceIdentification, ['fees'])) {
          _serviceIdentification.fees = serviceIdentification.fees;
      }
      if (this.WpsHelperSvc.objHasKeys(serviceIdentification, ['accessConstraints'])) {
          _serviceIdentification.accessConstraints = serviceIdentification.accessConstraints[0];
      }

      return _serviceIdentification;
  }

  //listAvailable = ['providerName', 'providerSite', 'serviceContact'];
  parseServiceProvider(serviceProvider) {
      var _serviceProvider: any = {};

      if (this.WpsHelperSvc.objHasKeys(serviceProvider, ['providerName'])) {
          _serviceProvider.providerName = serviceProvider.providerName;
      }

      return _serviceProvider;
  }



  // describeProcess -------------------------------------------------------------------
  // http://geoprocessing.info/wpsdoc/serv?request=HYPERLINKED&schema=wps:ProcessDescription
  describeProcess(url, processIdentifier, callback) {
      var wpsQuery = {
          service: 'WPS',
          version: '1.0.0',
          request: 'DescribeProcess',
          identifier: processIdentifier
      };

      var pathUrl = url + this.WpsHelperSvc.buildQuery(wpsQuery)
      var wpsurl: encodeURIComponent(pathUrl);

      return this.http.get(wpsurl);

  }

  //listAvailable = ['service', 'version', 'processDescription'];
  parseDescribeProcess(descripion) {
      var _DescribeProcess: any = {};
      var array, len, d = 0,
          _description;

      if (this.WpsHelperSvc.objHasKeys(descripion, ['version'])) {
          _DescribeProcess.version = descripion.version;
      }
      if (this.WpsHelperSvc.objHasKeys(descripion, ['service'])) {
          _DescribeProcess.service = descripion.service;
      }
      if (this.WpsHelperSvc.objHasKeys(descripion, ['processDescription'])) {
          _DescribeProcess.processDescription = this.parseProcessDescriptions(descripion.processDescription);
      }

      return _DescribeProcess;
  }

  parseProcessDescriptions(array) {
      var _ProcessDescriptions = [];
      var len, d = 0,
          _description;
      len = array.length;

      for (d; d < len; d++) {
          _description = array[d];

          _ProcessDescriptions[d] = this.parseDescription(_description);
      }

      return _ProcessDescriptions;
  }

  //listAvailable = ['processVersion', 'storeSupported', 'statusSupported', 'identifier', 'title', '_abstract', 'metadata', 'profile', 'wsdl', 'dataInputs', 'processOutputs'];
  parseDescription(descripions) {
      var _processDescription: any = {}, _processOutputs, _processIutputs;

      if (this.WpsHelperSvc.objHasKeys(descripions, ['processVersion'])) {
          _processDescription.processVersion = descripions.processVersion;
      }
      if (this.WpsHelperSvc.objHasKeys(descripions, ['storeSupported'])) {
          _processDescription.storeSupported = descripions.storeSupported;
      }
      if (this.WpsHelperSvc.objHasKeys(descripions, ['statusSupported'])) {
          _processDescription.statusSupported = descripions.statusSupported;
      }

      if (this.WpsHelperSvc.objHasKeys(descripions, ['identifier', 'value'])) {
          _processDescription.identifier = descripions.identifier.value;
      }

      if (this.WpsHelperSvc.objHasKeys(descripions, ['title', 'value'])) {
          _processDescription.title = descripions.title.value;
      }

      if (this.WpsHelperSvc.objHasKeys(descripions, ['_abstract', 'value'])) {
          _processDescription.abstract = descripions._abstract.value;
      }

      if (this.WpsHelperSvc.objHasKeys(descripions, ['dataInputs', 'input'])) {
          _processIutputs = this.parseProcessInputs(descripions.dataInputs.input);
          console.log(_processIutputs)
          _processDescription.input = this.WpsSchemaSvc.processInputs2schema(_processIutputs)
      }

      if (this.WpsHelperSvc.objHasKeys(descripions, ['processOutputs', 'output'])) {
          _processOutputs = this.parseProcessOutputs(descripions.processOutputs.output);
          _processDescription.output = this.WpsSchemaSvc.processOutputs2schema(_processOutputs);
      }

      return _processDescription;
  }

  parseProcessInputs(array):Array<TInput>{
      var len, i = 0,
          _input, parsedInput, _inputsArr = [];
      len = array.length;

      for (i; i < len; i++) {
          _input = array[i];
          parsedInput = this.parseInput(_input);
          _inputsArr.push(parsedInput)
      }

      return _inputsArr;
  }

  parseProcessOutputs(array):Array<TOutput> {
      var len, o = 0,
          _output, parsedOutput, _outputsArr = [];
      len = array.length;

      for (o; o < len; o++) {
          _output = array[o];
          parsedOutput = this.parseOutput(_output);
          _outputsArr.push(parsedOutput);
      }

      return _outputsArr;
  }




  //listAvailable = ['identifier', 'title', 'complexOutput', 'literalOutput', 'boundingBoxOutput', 'data'];
  parseOutput(output) {
      var _output: any = {};

      if (this.WpsHelperSvc.objHasKeys(output, ['identifier', 'value'])) {
          _output.identifier = output.identifier.value;
      }

      if (this.WpsHelperSvc.objHasKeys(output, ['title', 'value'])) {
          _output.title = output.title.value;
      }

      if (this.WpsHelperSvc.objHasKeys(output, ['complexOutput'])) {
          _output.complexOutput = this.parseComplexData(output.complexOutput);
      }

      if (this.WpsHelperSvc.objHasKeys(output, ['literalOutput'])) {
          _output.literalOutput = this.parseLiteralData(output.literalOutput);
      }

      if (this.WpsHelperSvc.objHasKeys(output, ['reference', 'href'])) {
          _output.reference = output.reference.href;
      }

      //test
      if (this.WpsHelperSvc.objHasKeys(output, ['reference', 'mimeType'])) {
          _output.mimeType = output.reference.mimeType;
      }

      if (this.WpsHelperSvc.objHasKeys(output, ['data'])) {
          if (this.WpsHelperSvc.objHasKeys(output.data, ['complexData', 'value'])) {
              _output.data = this.parseComplexData(output.data.complexData);
          }

          if (this.WpsHelperSvc.objHasKeys(output.data, ['literalData', 'value'])) {
              _output.data = this.parseLiteralData(output.data.literalData);
          }
      }

      return _output;
  }

  //listAvailable = ['minOccurs', 'maxOccurs', 'identifier', 'title', '_abstract', 'complexData', 'literalData', 'boundingBoxData'];
  parseInput(input) {
      var _input: any = {};

      if (this.WpsHelperSvc.objHasKeys(input, ['minOccurs'])) {
          _input.minOccurs = input.minOccurs;
      }
      if (this.WpsHelperSvc.objHasKeys(input, ['maxOccurs'])) {
          _input.maxOccurs = input.maxOccurs;
      }

      if (this.WpsHelperSvc.objHasKeys(input, ['identifier', 'value'])) {
          _input.identifier = input.identifier.value;
      }

      if (this.WpsHelperSvc.objHasKeys(input, ['title', 'value'])) {
          _input.title = input.title.value;
      }
      if (this.WpsHelperSvc.objHasKeys(input, ['_abstract', 'value'])) {
          _input._abstract = input._abstract.value;
      }

      if (this.WpsHelperSvc.objHasKeys(input, ['complexData'])) {
          _input.complexData = this.parseComplexData(input.complexData);
      }
      if (this.WpsHelperSvc.objHasKeys(input, ['literalData'])) {
          _input.literalData = this.parseLiteralData(input.literalData);
      }


      //if (this.WpsHelperSvc.objHasKeys(input, ['boundingBoxData'])) {  _input.boundingBoxData = input.boundingBoxData;}

      return _input;
  }

  //listAvailable = ['maximumMegabytes', '_default', 'supported'];
  parseComplexData(data) {
      var _complexData: any = {};

      if (this.WpsHelperSvc.objHasKeys(data, ['maximumMegabytes'])) {
          _complexData.maximumMegabytes = data.maximumMegabytes;
      }
      if (this.WpsHelperSvc.objHasKeys(data, ['_default', 'format'])) {
          _complexData._default = data._default.format;
      }
      if (this.WpsHelperSvc.objHasKeys(data, ['supported', 'format'])) {
          _complexData.supported = data.supported.format;
      }

      return _complexData;
  }


  //listAvailable = ['dataType', 'anyValue', 'allowedValues', 'reference', 'valuesForm', 'defaultValue'];
  parseLiteralData(data) {
      var _literalData: any = {};

      if (this.WpsHelperSvc.objHasKeys(data, ['dataType'])) {
        if (this.WpsHelperSvc.objHasKeys(data, ['dataType', 'value'])) {
            //_literalData.dataType = this.getFormTypeForDataType(data.dataType.value);
            _literalData.dataType = data.dataType.value;
        }
      }
      if (this.WpsHelperSvc.objHasKeys(data, ['anyValue'])) {
          _literalData.anyValue = "all values allowed";
      }
      if (this.WpsHelperSvc.objHasKeys(data, ['allowedValues', 'valueOrRange'])) {
          _literalData.allowedValues = this.WpsHelperSvc.getArrayFromArrayObjects(data.allowedValues.valueOrRange, 'value');
      }
      if (this.WpsHelperSvc.objHasKeys(data, ['defaultValue'])) {
          _literalData.defaultValue = data.defaultValue;
      }
      if (this.WpsHelperSvc.objHasKeys(data, ['value'])) {
          _literalData.value = data.value;
      }

      return _literalData;
  }

  //listAvailable = [];

  //function parseBoundingBoxData(data) {
  //    var _boundingBoxData = {};
  //
  //    return _boundingBoxData;
  //  }



  // executeProcess
  executeProcess(url, processIdentifier, body, responseFormType, callback) {

      var wpsQuery = {
          service: 'WPS',
          version: '1.0.0',
          request: 'Execute',
          identifier: processIdentifier
      };

      var pathUrl = url + this.WpsHelperSvc.buildQuery(wpsQuery)
      var query = {
          responseFormType: responseFormType,
          wpsurl: encodeURIComponent(pathUrl),
      }

      this.Restangular.oneUrl(this.baseUrl).customPOST(body, 'Execute', query, {}).then((result) => {
          callback(result);
      });

  }

  /**
  * http://docs.geoserver.org/latest/en/user/services/wps/operations.html#dismiss
  */
  //http://host:port/geoserver/ows?service=WPS&version=1.0.0&request=Dismiss&executionId=397e8cbd-7d51-48c5-ad72-b0fcbe7cfbdb
  dismissProcess(url:string, executionId:string, callback:Function){
    var wpsQuery = {
        service: 'WPS',
        version: '1.0.0',
        request: 'Dismiss',
        executionId: executionId
    };

    var pathUrl = url + this.WpsHelperSvc.buildQuery(wpsQuery)

    var query = {
        wpsurl: encodeURIComponent(pathUrl),
    }

    /**
    *  returns executeInfo:{} with status processFailed and  exceptionText: The process execution has been dismissed
    */
    this.Restangular.oneUrl(this.baseUrl).customGET('Dismiss', query).then((result) => {
        angular.extend(result, {
            pathUrl: pathUrl
        });

        var executeResponse = this.parseExecuteResponse(result.value)
        callback(executeResponse);
    });
  }

  createInputBody(scopeModel) {
      var input, identifier, template, tempInputs = [];
      for (var i in scopeModel) {
          input = scopeModel[i];
          identifier = i;
          template = {
              TYPE_NAME: "WPS_1_0_0.InputType",
              identifier: {
                  TYPE_NAME: "OWS_1_1_0.CodeType",
                  value: ''
              },
              data: {}
          };

          if (this.WpsHelperSvc.objHasKeys(input, ['complexData', 'value'])) {
              console.info('use identifier in create input from modle.identifier not title')
              template.identifier.value = input.complexData.identifier;
              template.data = {
                  "TYPE_NAME": "WPS_1_0_0.DataType",
                  "complexData": {
                      "TYPE_NAME": "WPS_1_0_0.ComplexDataType",
                      "mimeType": input.complexData.mimeType,
                      "otherAttributes": {
                          "mimeType": input.complexData.mimeType
                      },
                      "content": [input.complexData.value]
                  }
              }
          }

          if (this.WpsHelperSvc.objHasKeys(input, ['literalData', 'value'])) {
              console.info('use identifier in create input from modle.identifier not title')
              template.identifier.value = input.literalData.identifier;
              template.data = {
                  "TYPE_NAME": "WPS_1_0_0.DataType",
                  "literalData": {
                      "TYPE_NAME": "WPS_1_0_0.LiteralDataType",
                      "dataType": input.literalData.dataType || 'string',
                      "value": input.literalData.value.toString()
                  }
              }
          }

          tempInputs.push(template);
      }

      return tempInputs;
  }


  createOutputsBody(scopeModel, template) {
      var output, tempOutputs = [],
          identifier, _template: any;
      for (var o in scopeModel) {
          output = scopeModel[o];

          identifier = o;
          _template = {};
          //copy that template loose objcet-reference (refactor with template constructor)
          angular.copy(template, _template);
          console.info('use identifier in create output from modle.identifier not title')
          //_template.identifier.value = identifier;


          if (this.WpsHelperSvc.objHasKeys(output, ['complexOutput', 'mimeType'])) {
              _template.mimeType = output.complexOutput.mimeType;

              console.info('use identifier in create output from modle.identifier not title')
              _template.identifier.value = output.complexOutput.identifier;
          }

          if(this.WpsHelperSvc.objHasKeys(output, ['literalOutput', 'value'])) {
            console.info('use identifier in create output from modle.identifier not title');
            _template.identifier.value = output.literalOutput.identifier;
          }

          tempOutputs.push(_template);
      }
      return tempOutputs;
  }


  createResponseFormBody(scopeModel, responseForm) {
      var responseFormType, template;

      var _responseForm: any = {
          "TYPE_NAME": "WPS_1_0_0.ResponseFormType"
      }

      if (responseForm === 'responseDocument') {
          template = {
              "TYPE_NAME": "WPS_1_0_0.DocumentOutputDefinitionType",
              "asReference": true,
              "mimeType": "",
              //"encoding": "",
              //"schema": "",
              //"uom": "",
              "identifier": {
                  "TYPE_NAME": "OWS_1_1_0.CodeType",
                  "value": ""
              }
          };

          _responseForm.responseDocument = {
              "TYPE_NAME": "WPS_1_0_0.ResponseDocumentType",
              "storeExecuteResponse": true,
              "lineage": true,
              "status": true,
              "output": this.createOutputsBody(scopeModel, template)
          }


      } else if (responseForm === 'rawDataOutput') {
          template = {
              "TYPE_NAME": "WPS_1_0_0.OutputDefinitionType",
              "mimeType": "",
              //"encoding": "",
              //"schema": "",
              //"uom": "",
              "identifier": {
                  "TYPE_NAME": "OWS_1_1_0.CodeType",
                  "value": ""
              }
          }

          _responseForm.rawDataOutput = this.createOutputsBody(scopeModel, template)[0];

      }

      return _responseForm;
  }


  //only for complexData or literalData!!!!!!!!!
  createExecuteBody(scopeInputModel, scopeOutputModel, processIdentifier, responseForm) {

      var _body = {
          name: {
              namespaceURI: "http://www.opengis.net/wps/1.0.0",
              localPart: "Execute",
              prefix: "wps",
              key: "{http://www.opengis.net/wps/1.0.0}Execute",
              string: "{http://www.opengis.net/wps/1.0.0}wps:Execute"
          },
          value: {
              TYPE_NAME: "WPS_1_0_0.Execute",
              version: "1.0.0",
              service: "WPS",
              identifier: {
                  "TYPE_NAME": "OWS_1_1_0.CodeType",
                  "value": processIdentifier
              },
              dataInputs: {
                  TYPE_NAME: "WPS_1_0_0.DataInputsType",
                  input: this.createInputBody(scopeInputModel)
              },
              responseForm: this.createResponseFormBody(scopeOutputModel, responseForm)
          }
      };

      return _body;
  }

  //listAvailable = ['service', 'version', 'lang', 'statusLocation', 'serviceInstance', 'process', 'status', 'dataInputs', 'outputDefinitions', 'processOutputs' ];
  parseExecuteResponse(executeInfo) {
      var _executeInfo: any = {}, _status, _processOutputs;
      _executeInfo.status = {};

      if (this.WpsHelperSvc.objHasKeys(executeInfo, ['statusLocation'])) {
          _executeInfo.statusLocation = this.WpsHelperSvc.parseUrl(executeInfo.statusLocation);
      }

      if (this.WpsHelperSvc.objHasKeys(executeInfo, ['process', 'identifier', 'value'])) {
          _executeInfo.status.identifier = executeInfo.process.identifier.value;
      }

      if (this.WpsHelperSvc.objHasKeys(executeInfo, ['process'])) {
          _executeInfo.process = {
            title: executeInfo.process.title.value,
            identifier: executeInfo.process.identifier.value,
            version: executeInfo.process.processVersion,
            description: executeInfo.process._abstract.value
          }
      }

      if (this.WpsHelperSvc.objHasKeys(executeInfo, ['processOutputs', 'output'])) {
          _processOutputs = this.parseProcessOutputs(executeInfo.processOutputs.output);
          //_executeInfo.processOutputs =  processOutputs2schema(_processOutputs);
          _executeInfo.processOutputs = _processOutputs;
      }


      //creationTime,ProcessAccepted,ProcessStarted,ProcessPaused,ProcessSucceeded,ProcessFailed
      if (this.WpsHelperSvc.objHasKeys(executeInfo, ['status'])) {
          _status = executeInfo.status;

          if (this.WpsHelperSvc.objHasKeys(_status, ['creationTime'])) {
              _executeInfo.status.creationTime = this.WpsHelperSvc.jsonixTime2Date(_status.creationTime);
          }

          if (this.WpsHelperSvc.objHasKeys(_status, ['processAccepted'])) {
              _executeInfo.status.processAccepted = _status.processAccepted;
          }

          if (this.WpsHelperSvc.objHasKeys(_status, ['processStarted'])) {
              if (_status.processStarted.percentCompleted || _status.processStarted.percentCompleted == 0) {
                  _executeInfo.status.percentCompleted = _status.processStarted.percentCompleted;
              } else {
                  _executeInfo.status.processStarted = _status.processStarted;
              }
          }

          if (this.WpsHelperSvc.objHasKeys(_status, ['processPaused'])) {
              _executeInfo.status.processPaused = _status.processPaused;
          }

          if (this.WpsHelperSvc.objHasKeys(_status, ['processSucceeded'])) {
              _executeInfo.status.processSucceeded = _status.processSucceeded;
          }

          if (this.WpsHelperSvc.objHasKeys(_status, ['processFailed'])) {
              //_executeInfo.status.processFailed = _status.processFailed;
              _executeInfo.status.processFailed = this.parseExceptionReport(_status.processFailed);
              _executeInfo.status.processFailed = _executeInfo.status.processFailed.exceptionCode + " -> " + _executeInfo.status.processFailed.exceptionText;
          }

      }

      return _executeInfo;
  }

  parseExceptionReport(processFailed) {
      console.info('parseExceptionReport: only prints the first Exception, look if there are more then one!')
      var _processFailed = processFailed;
      var _exceptionReport = null;
      if (this.WpsHelperSvc.objHasKeys(_processFailed, ['exception'])) {
          _exceptionReport = {
              exceptionCode: _processFailed.exception[0].exceptionCode,
              exceptionText: _processFailed.exception[0].exceptionText[0].replace(/&quot;/g, ' ')
          }
      }
      if (this.WpsHelperSvc.objHasKeys(_processFailed, ['exceptionReport', 'exception'])) {
          _exceptionReport = {
              exceptionCode: _processFailed.exceptionReport.exception[0].exceptionCode,
              exceptionText: _processFailed.exceptionReport.exception[0].exceptionText[0].replace(/&quot;/g, ' ')
          }
      }
      if(_exceptionReport){
        this.$rootScope.$broadcast('setAlert', {
            alert: {
                "type": 'alert-danger',
                "status": _exceptionReport.exceptionCode,
                "data": _exceptionReport.exceptionText
            }
        });
      }
      return _exceptionReport;
  }


  requestStatus(statusLocation, callback) {
      var url = statusLocation.url;
      var wpsQuery = statusLocation.queryParams;
      var pathUrl = url + this.WpsHelperSvc.buildQuery(wpsQuery)
      var query = {
          wpsurl: encodeURIComponent(pathUrl),
      }

      this.Restangular.oneUrl(this.baseUrl).customGET('GetProcessStatus', query).then((result) => {
          var executeResponse = this.parseExecuteResponse(result.value)
          callback(executeResponse);
      });
  }

  getExecutionResult(_url, callback) {
      var resultLocation = this.WpsHelperSvc.parseUrl(_url)
      var url = resultLocation.url;
      var wpsQuery = resultLocation.queryParams;
      var pathUrl = url + this.WpsHelperSvc.buildQuery(wpsQuery)
      var query = {
          wpsurl: encodeURIComponent(pathUrl),
      }
      console.log(this.baseUrl,query)
      this.Restangular.oneUrl(this.baseUrl).customGET('GetProcessStatus', query).then((result) => {
          callback(result);
      });
  }

  //listAvailable = ['service', 'version', 'lang', 'statusLocation', 'serviceInstance', 'process', 'status', 'dataInputs', 'outputDefinitions', 'processOutputs' ];

  //function parseStatusResponse(statusInfo){
  //  var _statusInfo = {};
  //  return _statusInfo;
  //}


  responeException(response) {
      if (this.WpsHelperSvc.objHasKeys(response, ['exception'])) {
          return true;
      }
  }


}