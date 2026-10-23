# Atlas mais rápido no modo conversa

Hoje cada fala passa por 3 etapas em sequência, cada uma esperando a anterior terminar inteira: (1) espera 1s de silêncio, (2) gera a resposta completa, (3) gera o áudio completo e só então começa a falar. Além disso, todo o contexto do painel vai junto em cada pergunta. Vamos fazer o Atlas começar a falar enquanto ainda pensa.

## O que muda para você
- O Atlas começa a falar em cerca de 1 segundo após você parar, em vez de vários segundos.
- Respostas de voz mais curtas e naturais, como numa conversa.
- Ele percebe mais rápido que você terminou de falar.
- Você continua podendo interromper a qualquer momento.

## Como
1. **Resposta em fluxo**: o Atlas envia a resposta aos pedaços, conforme vai escrevendo, em vez de tudo de uma vez.
2. **Fala frase a frase**: assim que a primeira frase chega, ela já é convertida em voz e tocada; as próximas são preparadas em paralelo e tocam em sequência, sem pausa.
3. **Modelo rápido para voz**: no modo conversa, usar por padrão um modelo leve e sem raciocínio estendido (a escolha manual nas configurações continua valendo).
4. **Contexto enxuto na voz**: enviar um resumo compacto dos dados do painel, não o contexto completo.
5. **Silêncio menor**: padrão de detecção de fim de fala cai de 1s para 0,7s (ajustável nas configurações, como hoje).
6. **Som de "pensando"**: um retorno sonoro discreto e a frase aparece na tela imediatamente, para a espera não parecer vazia.

## Detalhes técnicos
- Nova rota de streaming `src/routes/api/atlas-stream.ts` (auth via bearer + `is_member`), chamando OpenAI chat completions com `stream: true`, repassando SSE de texto; tool call de filtros acumulado e enviado como evento final.
- `voice-mode.tsx`: ler o stream, cortar por fim de frase (`. ! ? \n`), fila de TTS com até 2 requisições em paralelo e reprodução encadeada; fallback para voz do navegador por frase.
- `ai.functions.ts`: para voz, `reasoning_effort: "minimal"`/modelo mini por padrão, `max_tokens` baixo.
- `voice-settings.ts`: default `silenceMs` 700.
- Texto do chat continua usando `askAssistant` sem alteração.
- Medir antes/depois (tempo até primeiro áudio) via log no console durante teste.
