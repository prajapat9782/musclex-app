# MuscleX — UI design

A saved copy of every MuscleX screen from the design canvas:
**https://claude.ai/artifact/LTvjh9VXbqErXAT9Mc5Q8d** (private until shared from its Share menu).

`screens/` holds the editable source of each screen (`*.dc.html`) and the canvas layout (`canvas.json`).
These files are the originals: they can be published back to a design canvas at any time.

## Screens (27 + 1 component)

| # | Screen | File |
|---|---|---|
| 01 | Welcome | `Main.dc.html` |
| 02 | Sign up / Log in | `SignUp.dc.html` |
| 03 | Setup · About you (full working flow) | `Onboarding.dc.html` |
| 04 | Setup · Body | `Setup2Body.dc.html` |
| 05 | Setup · Goal | `Setup3Goal.dc.html` |
| 06 | Setup · Activity & training | `Setup4Activity.dc.html` |
| 07 | Setup · News interests | `Setup5Interests.dc.html` |
| 08 | Setup · Your plan | `Setup6Plan.dc.html` |
| 08b | Home · Day 1 (new user) | `HomeNew.dc.html` |
| 09 | Home · Today | `Home.dc.html` |
| 10 | Live workout | `Workout.dc.html` |
| 11 | Workout complete | `WorkoutDone.dc.html` |
| 12 | Progress | `Progress.dc.html` |
| 13 | Meal plan | `Meals.dc.html` |
| 13a | Food diary · past days | `FoodDiary.dc.html` |
| 13b | Log food · search, my meals, quick add | `FoodLog.dc.html` |
| 13c | Meal details | `MealDetail.dc.html` |
| 13d | Barcode scan | `Scan.dc.html` |
| 13e | Water tracker | `Water.dc.html` |
| 14 | Community | `Community.dc.html` |
| 15 | Athlete public profile | `Athlete.dc.html` |
| 16 | News (on hold) | `News.dc.html` |
| 17 | Article (on hold) | `Article.dc.html` |
| 18 | Profile & settings | `Profile.dc.html` |
| 19 | Notifications | `Notifications.dc.html` |
| 20 | Exercise library | `Exercises.dc.html` |
| — | Component · Tab bar | `TabBar.dc.html` |

All screens are 390 × 844 (iPhone 14/15 size); the tab bar is 390 × 84.

## Design tokens

Used in both the design and the app (`src/theme/theme.tsx`).

| Token | Dark | Light |
|---|---|---|
| Background | `#0E0F0C` | `#F5F5F0` |
| Surface (cards) | `#1A1C17` | `#FFFFFF` |
| Surface 2 | `#24271F` | `#ECEDE6` |
| Line / border | `#2A2D25` | `#DEDFD6` |
| Text | `#F2F2EE` | `#141512` |
| Muted text | `#A3A69C` | `#5E6158` |
| Streak / warning (flame) | `#FF8A4C` | `#C2410C` |
| Water / carbs (sky) | `#7CC8FF` | `#1D5FA3` |
| Accent (default, user can change) | `#C6F432` Volt lime | same; text uses a darker shade in light mode |

Other accent choices: `#FF8A4C` Ember orange, `#7CC8FF` Sky blue, `#E9B8FF` Lilac, `#5EEAD4` Mint, `#FFD43B` Gold.

- **Fonts**: Space Grotesk 600/700 for headings and numbers, Inter 400–700 for text.
- **Radius**: 14–24 px on cards, 22 px on chips, 12–16 px on buttons.
- **Touch targets**: 44 px minimum.
- **Icons**: 2 px stroke line icons, 24 px grid.

## Getting the screens into Figma

The design canvas has no direct Figma export. Two ways that work:

1. **As images**: open the canvas link above, then Share → Export → PNG (or PDF), and drag the files into Figma.
   Quick, but the layers are flat.
2. **As editable layers**: in Figma, install the free **html.to.design** plugin, publish or share the canvas,
   and import each screen's page by URL. Text, colours and layout come in as real Figma layers.
