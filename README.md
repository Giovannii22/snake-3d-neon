# Snake 3D Neon

Jogo da cobrinha (Snake) em 3D com estética neon, jogável direto no navegador — desktop ou mobile. Sem backend, sem banco de dados, sem build step: HTML, CSS e JavaScript puro, com Three.js carregado via CDN.

**Jogue:** https://giovannii22.github.io/snake-3d-neon/

## Tecnologias e linguagens

| Camada | Tecnologia | Por quê |
|---|---|---|
| Renderização 3D | [Three.js](https://threejs.org/) (r160) via CDN (`import map`, ES Modules) | Motor 3D padrão da indústria; usado direto do CDN para não precisar de `npm install`/bundler para um projeto deste porte |
| Pós-processamento | `EffectComposer` + `UnrealBloomPass` + `OutputPass` (addons do Three.js) | Gera o glow neon a partir de cores saturadas, sem escrever shader customizado |
| Lógica do jogo | JavaScript (ES Modules), vanilla, sem framework | Estado do jogo é simples (grid, direção, score) — não justifica React/Vue ou gerenciador de estado |
| Estrutura da página | HTML5 | Um único documento com overlays de UI sobre o `<canvas>` |
| Estilo | CSS3 (variáveis, `@media`, `backdrop-filter`) | Tema neon, responsivo, sem dependência de framework CSS |
| Tipografia | Google Fonts — `Orbitron` (títulos/HUD) e `Rajdhani` (texto) | Fontes com apelo "tech/neon" |
| Áudio | Web Audio API (`AudioContext`/`OscillatorNode`) | Bipes sintetizados em código — sem arquivos de áudio externos |
| Persistência | `localStorage` do navegador | Só guarda o recorde (high score); não é um banco de dados, é local a cada navegador/dispositivo |
| Hospedagem | GitHub Pages (arquivos estáticos) | Site estático, sem servidor próprio |

Nenhum bundler (Vite/Webpack), nenhum gerenciador de pacotes (`package.json`), nenhuma engine de física — deliberadamente, para manter o projeto no mínimo de código necessário.

## Estrutura de arquivos

```
snake-3d-neon/
├── index.html    # Estrutura da página, import map do Three.js, overlays de UI (HUD, telas)
├── style.css     # Tema visual neon, tipografia, responsividade, animações CSS
├── script.js     # Toda a lógica: cena 3D, câmera, input, regras do jogo, áudio, loop
├── og-image.png  # Imagem de preview ao compartilhar o link (Open Graph / Twitter Card)
└── README.md
```

Não há `package.json` nem dependências instaladas — o Three.js e as fontes são carregados via CDN diretamente no `index.html`.

## Arquitetura e lógica do jogo

### Grid lógico e movimento
O tabuleiro é uma matriz lógica `GRID_SIZE × GRID_SIZE` (20×20), independente da malha 3D. A cobra é um array de células `{x, z}` (índice 0 = cabeça). A cada "tick" (intervalo de tempo fixo, não a cada frame):

1. A direção pendente (`pendingDirection`) vira a direção atual.
2. Calcula-se a nova posição da cabeça com **wrap-around**: `(v + GRID_SIZE) % GRID_SIZE` — ao invés de checar limites, o índice sempre "roda" para o lado oposto.
3. Verifica auto-colisão comparando a nova cabeça com o próprio corpo, **exceto o último segmento** (que sempre libera aquela célula no mesmo passo, já que a cauda anda junto).
4. Se colidiu: fim de jogo. Se comeu a comida: cresce, pontua, acelera levemente e sorteia nova comida. Caso contrário: anda normalmente (adiciona a cabeça, remove a cauda).

O loop de renderização usa `requestAnimationFrame` (suave, ~60fps), mas o movimento da cobra roda num intervalo próprio (acumulador de delta-time), desacoplado da taxa de quadros — por isso a velocidade do jogo não depende do hardware.

### Velocidade progressiva
A cada comida, o intervalo entre movimentos diminui (`TICK_BASE - score * SPEEDUP_PER_FOOD`, com um piso mínimo `TICK_MIN`). Ou seja, o jogo acelera conforme a pontuação sobe — não com o tempo puro.

### Renderização 3D
- **Câmera**: `OrthographicCamera` fixa, olhando diretamente de cima para baixo (sem inclinação/perspectiva) — mantém o jogo estritamente nos eixos X/Z do tabuleiro, mapeados para X/Y da tela.
- **Ajuste de enquadramento**: a câmera recalcula seus limites (`left/right/top/bottom`) dinamicamente conforme a proporção da tela (`aspect`), priorizando a dimensão mais restritiva — evita cortar o tabuleiro tanto em telas largas (landscape) quanto estreitas (portrait).
- **Cobra e comida**: `BoxGeometry` (segmentos) e `OctahedronGeometry` (comida) com `MeshBasicMaterial` (sem iluminação/sombra — visual "auto-brilhante", estilo Tron).
- **Pool de meshes**: os cubos da cobra são reaproveitados e reposicionados a cada tick (cresce/encolhe o pool conforme o tamanho da cobra), em vez de recriar objetos 3D a cada movimento.
- **Neon**: obtido via `UnrealBloomPass` — o post-processing "estoura" o brilho de qualquer pixel acima de um limiar de luminância, criando o halo neon em cima de cores simples.

### Estados do jogo
`ready` (aguardando primeira jogada) → `playing` → `paused` (pausável a qualquer momento) → `gameover` (com tela de pontuação final e botão de reiniciar).

### Entrada (input)
- **Teclado**: setas ou `WASD` para mover; `P` ou `Espaço` para pausar/retomar.
- **Touch (mobile)**: swipe (arrastar o dedo) em qualquer direção para mover; botão circular na tela para pausar.
- Reversão de 180° (ex. ir para a direita e virar para a esquerda instantaneamente) é bloqueada, para evitar colisão acidental com o próprio corpo.

### Áudio e persistência
- Efeitos sonoros gerados em tempo real via osciladores da Web Audio API (sem arquivos `.mp3`/`.wav`).
- Recorde salvo em `localStorage` (`snake3dneon-highscore`), local ao navegador — não sincroniza entre dispositivos.

## Como rodar localmente

Os módulos ES exigem HTTP — abrir `index.html` direto por `file://` não funciona. Use um servidor local simples, na pasta do projeto:

```
npx serve .
```

ou, com Python:

```
python -m http.server 8000
```

Depois abra o endereço mostrado no terminal (ex. `http://localhost:3000` ou `http://localhost:8000`) no navegador.

## Controles

- Setas ou `WASD` para mover (desktop).
- Swipe (arrastar o dedo) para mover (mobile).
- `P` / `Espaço` ou o botão na tela para pausar.
- A cobra atravessa as bordas do mapa e reaparece do lado oposto (wrap-around).
- Pressione uma direção (ou dê um swipe) para começar; após "game over", clique em "Jogar novamente".
