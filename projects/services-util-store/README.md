# @dlr-eoc/services-util-store

### how to use this in a ukis-angular (@dlr-eoc/core-ui) project

```
import { UtilStoreService } from '@dlr-eoc/services-util-store';
```

```
constructor(private UtilStore: UtilStoreService,...)
```

```
function(){
  // set value
  this.UtilStore.local(key, value);

  // get value
  const value = this.UtilStore.local(key);
}
```


For examples see:
- [demo maps](../demo-maps/README.md)
- [cookie-alert](../cookie-alert/src/lib/cookie-alert.component.ts)


This module is used by components like:
- @dlr-eoc/cookie-alert
- @dlr-eoc/services-ogc
- ...


It implements a basic 'storage' to store key value based data in:
- local: localStorage
- session: sessionStorage
- runtime: runtimeStorage
- cookie


for more details [see map-state](../services-util-store/src/lib/util-store.service.ts)




===

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 8.2.14.

## Code scaffolding

Run `ng generate component component-name --project services-util-store` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module --project services-util-store`.
> Note: Don't forget to add `--project services-util-store` or else it will be added to the default project in your `angular.json` file. 

## Build

Run `ng build services-util-store` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test services-util-store` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
