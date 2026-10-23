# Atualizar a lista de modelos da OpenAI

## O que muda
A lista de modelos no bloco "Inteligência artificial (OpenAI)", em Integrações, passa a mostrar os modelos atuais da OpenAI:

| Modelo | Para quê | Custo aproximado (entrada / saída, por 1 milhão de tokens) |
|---|---|---|
| GPT-6 Luna (recomendado) | Rápido e barato, ideal para o chat e o modo conversa | US$ 0,10 / US$ 0,50 |
| GPT-6.1 Sol | Equilíbrio entre inteligência e custo | US$ 2 / US$ 10 |
| GPT-6 Astra | O mais capaz, para análises complexas | US$ 10 / US$ 50 |
| GPT-4.1 mini (antigo) | Mantido para quem já usa | — |

- O modelo novo padrão passa a ser o GPT-6 Luna.
- Empresas que já salvaram gpt-4o-mini, gpt-4o ou gpt-4.1 continuam funcionando, e a tela mostra "modelo antigo, recomendamos trocar".
- Cada opção mostra uma descrição curta e a faixa de custo.

## Detalhes técnicos
- `ai-policy.ts`: `OPENAI_MODELS` = `gpt-6-luna`, `gpt-6.1-sol`, `gpt-6-astra`, `gpt-4.1-mini`, com rótulos e descrições; `LEGACY_MODELS` para os ids antigos aceitos ao ler a configuração; `DEFAULT_OPENAI_MODEL = gpt-6-luna`.
- `ai.functions.ts`: para os modelos GPT-6, enviar `reasoning_effort: "none"` no modo conversa e `"low"` no chat, para responder rápido.
- Atualizar o teste da política para cobrir o modelo padrão e a aceitação dos ids antigos.
