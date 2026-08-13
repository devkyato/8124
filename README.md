# 8124

hey! this is my small full-stack take on the classic 2048 game. i kept the gameplay familiar, made it work nicely on phones and desktops, and gave everything a simple black and white look.

the game stays simple, but the project uses the kind of setup i would be comfortable growing into a larger product.

## tech stack

- next.js app router for the full-stack framework
- react and typescript for the interface and game logic
- next.js route handlers for the score api
- zod for backend request validation
- react icons for the control guide
- vitest for game-logic tests
- `localstorage` for resumable games and personal best scores

the score api keeps a small bounded leaderboard in server memory. it is enough to show the backend flow locally without adding account or database setup to a tiny game.

## run

install the packages and start the development server:

```sh
npm install
npm run dev
```

then open `http://localhost:3000`.

run the tests with `npm test` and create a production build with `npm run build`.

## controls

- arrow keys or wasd on a keyboard
- swipe on a phone or tablet

## credits

built by [@devmako](https://github.com/devmako) and based on the original 2048 by gabriele cirulli.

made for the cool guy quantum.
