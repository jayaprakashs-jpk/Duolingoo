// Local Expo config plugin. It does three things that a plain app.json cannot:
//  1. Declares <queries> so Android 11+ can see the speech recognizer and TTS engines.
//  2. Makes the DEBUG build bundle its JavaScript, so app-debug.apk runs without Metro.
//  3. Gives Gradle enough memory for a full React Native build on small CI machines.
const {
  withAndroidManifest,
  withAppBuildGradle,
  withGradleProperties,
} = require('expo/config-plugins');

const QUERY_ACTIONS = ['android.speech.RecognitionService', 'android.intent.action.TTS_SERVICE'];

module.exports = function withLinguaSparkAndroid(config) {
  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    if (!manifest.queries || manifest.queries.length === 0) manifest.queries = [{}];
    const q = manifest.queries[0];
    q.intent = q.intent || [];
    for (const name of QUERY_ACTIONS) {
      const exists = q.intent.some((i) => (i.action || []).some((a) => a.$ && a.$['android:name'] === name));
      if (!exists) q.intent.push({ action: [{ $: { 'android:name': name } }] });
    }
    return c;
  });

  config = withAppBuildGradle(config, (c) => {
    const src = c.modResults.contents;
    if (c.modResults.language === 'groovy' && !src.includes('LinguaSpark: bundle JS')) {
      c.modResults.contents = src.replace(
        /react\s*\{/,
        'react {\n    // LinguaSpark: bundle JS into the debug APK so it runs without a Metro server\n    debuggableVariants = []'
      );
    }
    return c;
  });

  config = withGradleProperties(config, (c) => {
    const set = (key, value) => {
      const existing = c.modResults.find((p) => p.type === 'property' && p.key === key);
      if (existing) existing.value = value;
      else c.modResults.push({ type: 'property', key, value });
    };
    set('org.gradle.jvmargs', '-Xmx4096m -XX:MaxMetaspaceSize=1024m -Dfile.encoding=UTF-8');
    return c;
  });

  return config;
};
