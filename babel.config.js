// babel.config.js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
          },
        },
      ],
      // ⚠️ PHẢI nằm ở cuối cùng
      'react-native-reanimated/plugin',
    ],
  };
};
