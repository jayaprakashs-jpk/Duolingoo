# LinguaSpark

An offline-first language-learning app for Android. Built with **Expo SDK 54 (React Native + TypeScript)**, Expo Router, NativeWind, Reanimated, SQLite, and an optional **Supabase** backend.

It ships with two complete courses and works the moment it is installed. **No account, no keys, no internet needed** (Guest Mode).

| Course | Units | Lessons | Exercises | Also includes |
|---|---|---|---|---|
| English for Tamil Speakers | 3 | 15 | 171 | 3 guidebooks, 3 interactive stories, 3 Match/Ramp-Up rounds, 5 AI roleplays |
| Spanish for English Speakers | 3 | 15 | 171 | 3 guidebooks, 3 interactive stories, 3 Match/Ramp-Up rounds, 5 AI roleplays |

All 10 exercise types are real and playable: word bank, typed translation (typo and accent tolerant), multiple choice, listening, speaking, match pairs, fill-the-blank, dialogue, interactive story, timed challenge.

---

## 1. Get an APK

### Option A: GitHub Actions (no setup on your computer)
1. Push this repo to GitHub.
2. Push to `main`, or open **Actions → Build Android APK → Run workflow**.
3. When it finishes, open the run and download the artifacts:
   - `app-debug-apk` → `app-debug.apk`
   - `app-release-apk` → `app-release.apk`
4. Copy the APK to your phone and open it (allow "install unknown apps" once).

Both APKs contain the JavaScript bundle, so they run without a dev server. The release APK is signed with the **debug keystore** (Expo's default), which is why it installs. For the Play Store, create your own keystore and signing config.

### Option B: build locally
Needs: Node 20+, JDK 17, and the Android SDK (platform 36, build-tools 36.0.0, NDK 27.1.12297006, CMake 3.22.1). Set `ANDROID_HOME`.

```bash
npm ci
npx expo prebuild --platform android && cd android && ./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Release build: `./gradlew assembleRelease` → `android/app/build/outputs/apk/release/app-release.apk`.
Shortcuts: `npm run apk:debug`, `npm run apk:release`.

> The `android/` folder is generated (Expo "prebuild"), so it is git-ignored. Edit `app.json` and `plugins/withLinguaSparkAndroid.js`, not the generated files.

---

## 2. Optional: Supabase (accounts, sync, real leagues, family plan)

Skip this to stay in Guest Mode. To enable it:

1. Create a project at supabase.com.
2. **SQL editor**: run `supabase/schema.sql`, then `supabase/seed.sql` (the two bundled courses, so the backend and APK share one curriculum).
3. **Auth → Providers → Email**: for quick testing, turn off "Confirm email".
4. Copy `.env.example` to `.env` and fill in:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...      # the anon/public key, never the service-role key
   ```
   For GitHub Actions, add the same two values as repository **secrets**.
5. Rebuild the APK (env values are baked in at build time).

How sync works: every change is saved locally first and queued in SQLite. When the phone is online **and** signed in, the queue is sent to Supabase (on reconnect, on app open, and after changes). On sign-in the cloud copy is merged in (union of completed lessons, max of XP).

Regenerate the seed after editing the curriculum: `npm run seed:sql`.

### Subscriptions are server-controlled
The app can read its own row in `subscription_entitlements` but **cannot write it**. Rows are written by the `revenuecat-webhook` Edge Function. To test the family plan against a real Supabase user before RevenueCat is wired up, insert an entitlement by hand in the SQL editor:
```sql
insert into subscription_entitlements (user_id, tier) values ('<user uuid>', 'family')
on conflict (user_id) do update set tier = 'family';
```

### Edge Functions
```bash
supabase functions deploy ai-tutor                       # JWT-protected AI proxy
supabase secrets set OPENAI_API_KEY=sk-...               # or GEMINI_API_KEY=...
supabase functions deploy revenuecat-webhook --no-verify-jwt
supabase secrets set REVENUECAT_WEBHOOK_SECRET=<random>
```

---

## 3. AI tutor (video call + roleplay)

Three layers, tried in this order:

1. **Supabase Edge Function `ai-tutor`** when signed in. API keys stay on the server. Recommended.
2. **Direct OpenAI / Gemini** if `EXPO_PUBLIC_OPENAI_API_KEY` or `EXPO_PUBLIC_GEMINI_API_KEY` is set. **That key is baked into the APK and can be extracted by anyone who has it.** Use only for personal testing.
3. **Offline rule-based engine**, always available. Needs no key and no network. Roleplays are goal-driven scripts (greet, order, ask the price...); the call tutor matches topics and flags common grammar mistakes.

Settings → Backend and AI shows which layer is active. Speech input uses the phone's recognizer through `expo-speech-recognition`; if it is missing or denied, every screen falls back to a text box.

---

## 4. Subscription tiers

Settings → **Subscription tier simulator** switches between Free, Super, Super Family and Max instantly, so every perk can be tested with no purchase.

| Perk | Free | Super | Family | Max |
|---|---|---|---|---|
| Hearts | 5, +1 per 4 h | unlimited | unlimited | unlimited |
| Ads (placeholders) | yes | none | none | none |
| Practice Hub (mistakes inbox, weak-skill SRS, speaking/listening gym, library) | locked | yes | yes | yes |
| Legendary attempts | 100 gems | free | free | free |
| Monthly streak repair | no | yes | yes | yes |
| Offline unit packs | no | yes | yes | yes |
| Family (invite code, 5 members) | no | no | yes | no |
| AI video call + roleplay | no | no | no | yes |

The paywall uses a billing abstraction (`services/billing.ts`). With no key it simulates purchases. To sell for real, `npm i react-native-purchases`, set `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, create entitlements named `super`, `family`, `max` in RevenueCat, and point its webhook at `revenuecat-webhook`. Not wired to a live store account in this repo.

---

## 5. Add a language without rebuilding (Curriculum Studio)

Profile → **Curriculum Studio** → paste JSON or pick a `.json` file → Validate → Import. Tap **Template** for a working example. The compact format needs, per lesson: 4+ vocab items, 4+ sentences, one fill-blank and one dialogue. The app generates the 11 exercises per lesson, plus a story and a timed round per unit.

```json
{ "id": "fr-for-en", "title": "French for English Speakers", "flag": "🇫🇷",
  "native": { "code": "en", "name": "English", "tts": "en-US" },
  "target": { "code": "fr", "name": "French", "tts": "fr-FR", "stt": "fr-FR" },
  "units": [{ "title": "Bonjour!", "lessons": [{
      "title": "Greetings", "icon": "👋", "tip": "Bonjour is for daytime.",
      "v": [["bonjour","hello","👋"], ["merci","thank you"], ["oui","yes"], ["non","no"]],
      "s": [["Bonjour, comment ça va ?","Hello, how are you?"], ["Merci beaucoup","Thank you very much"],
            ["Oui, s’il vous plaît","Yes, please"], ["Ça va bien, merci","I am fine, thank you"]],
      "fill": { "before": "", "after": ", comment ça va ?", "opts": ["Bonjour","Merci","Non"], "ans": 0, "tr": "Hello, how are you?" },
      "dlg": { "lines": ["Bonjour, comment ça va ?"], "opts": ["Ça va bien, merci.","Non, non."], "ans": 0 } }] }] }
```
Courses imported this way live in the on-device database. You can also publish them to Supabase (`courses.spec`) so every install gets them.

---

## 6. Project layout

```
app/            Expo Router screens (tabs: Learn, Practice, Leagues, Quests, Profile + modals)
components/     UI kit, lesson runner, 10 exercise components, feedback sheet
data/           types, course builder, seed curriculum (data/seed/*)
services/       grading, SRS, SQLite, sync, auth, AI engines, sessions, billing, speech, sound
store/          zustand stores (app state persisted to AsyncStorage, catalog, transient)
supabase/       schema.sql, seed.sql, Edge Functions
plugins/        Expo config plugin (Android manifest queries, bundle JS in debug builds, Gradle memory)
scripts/        asset generators and the test suites
.github/workflows/build-apk.yml
```

## 7. Tests

```bash
npm run check
```
Type-checks, then verifies: every one of the 342 exercises grades correctly (right answer passes, wrong fails); all text-matching rules; both offline AI engines; spaced repetition; the real SQLite code against an in-memory SQLite; and the Studio importer. CI runs the same command before building.

## 8. Things to know

- **Tamil speech**: the phone must have a Tamil text-to-speech voice (Android Settings → Text-to-speech). The Offline Packs screen warns if it is missing. English and Spanish use the standard voices.
- **Speech recognition** needs Google speech services on the phone; otherwise the app falls back to typing.
- **XP, gems and streaks are written by the app.** Fine for a learning app, but a determined user could cheat the leaderboard. Validate lessons in an Edge Function before shipping competitive leagues.
- **Leagues**: rivals marked ✓ are real signed-in users. The rest are deterministic practice bots. Friend-quest partner progress is simulated.
- **Ads** are placeholders. Swap `components/AdPlaceholder.tsx` for a real ad SDK.
- **Offline packs** store lesson JSON and an audio manifest in SQLite. Spoken audio is generated on-device by the phone's TTS, so it works offline once the voice data is installed.
- `expo-av` is used for sound effects. It is deprecated by Expo and removed after SDK 54, so staying on SDK 54 is deliberate.
- Sound effects, icons and all content are original to this project.
