# Snake 3D Neon

Jogo da cobrinha em 3D com estética neon, feito com Three.js puro (sem build step).

## Como rodar

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

- Setas ou `WASD` para mover.
- A cobra atravessa as bordas do mapa e reaparece do lado oposto.
- Pressione uma direção para começar; após "game over", clique em "Jogar novamente".
