const instances = [];

const createInstance = () => {
  let handler = (config) =>
    Promise.resolve({
      data: {},
      status: 200,
      headers: {},
      config,
    });

  const requestHandlers = [];
  const responseHandlers = [];
  const responseErrorHandlers = [];

  const instance = (config = {}) => {
    let chain = Promise.resolve(config);

    requestHandlers.forEach((fn) => {
      chain = chain.then((current) => fn({ ...current }));
    });

    chain = chain.then((finalConfig) => handler(finalConfig));

    responseHandlers.forEach((fn) => {
      chain = chain.then((response) => fn({ ...response }));
    });

    if (responseErrorHandlers.length > 0) {
      chain = chain.catch((error) => {
        return responseErrorHandlers.reduce(
          (acc, fn) => acc.catch((err) => fn(err)),
          Promise.reject(error)
        );
      });
    }

    return chain;
  };

  instance.interceptors = {
    request: {
      use: (fulfilled) => {
        if (typeof fulfilled === 'function') {
          requestHandlers.push(fulfilled);
        }
      },
    },
    response: {
      use: (fulfilled, rejected) => {
        if (typeof fulfilled === 'function') {
          responseHandlers.push(fulfilled);
        }
        if (typeof rejected === 'function') {
          responseErrorHandlers.push(rejected);
        }
      },
    },
  };

  instance.__setHandler = (nextHandler) => {
    handler = nextHandler;
  };

  instance.__resetHandlers = () => {
    requestHandlers.length = 0;
    responseHandlers.length = 0;
    responseErrorHandlers.length = 0;
  };

  return instance;
};

const create = jest.fn(() => {
  const instance = createInstance();
  instances.push(instance);
  return instance;
});

const getLastInstance = () => instances[instances.length - 1];

const reset = () => {
  instances.splice(0, instances.length);
};

module.exports = {
  create,
  __getLastInstance: getLastInstance,
  __reset: reset,
};
