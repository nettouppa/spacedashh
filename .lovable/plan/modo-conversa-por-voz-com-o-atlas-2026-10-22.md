# Modo conversa por voz com o Atlas

Um novo ícone (ondas sonoras) ao lado do microfone, como no ChatGPT. Ao clicar, abre uma tela de conversa por voz dentro do painel do Atlas: você fala, o Atlas responde em voz alta e volta a ouvir sozinho, sem precisar clicar de novo.

## O que você verá
- **Novo botão "Conversar por voz"** na caixa de pergunta do Atlas.
- **Tela de voz** ocupando o painel: o ícone do astronauta no centro, com um círculo animado que muda conforme o momento:
  - Ouvindo (círculo pulsando em violeta, mostra o que você está falando)
  - Pensando (pontinhos animados)
  - Falando (ondas acompanhando a voz do Atlas e a frase sendo dita)
- **Controles embaixo:** silenciar o microfone, interromper o Atlas enquanto ele fala, e encerrar (X) para voltar ao chat.
- **Filtros funcionam por voz:** "mostre só a equipe Enterprise" aplica o filtro no painel na hora, e o Atlas confirma em voz alta.
- **Histórico:** tudo o que foi dito fica salvo na conversa do chat ao encerrar.
- **Respostas curtas no modo voz:** o Atlas responde em 1 a 3 frases, sem tabelas, próprias para ouvir.

## Detalhes técnicos
- Componente novo `VoiceMode` em `src/components/dash/voice-mode.tsx`, aberto a partir do `ai-panel.tsx`.
- Ciclo: reconhecimento de fala do navegador (pt-BR, detecta fim da fala) -> `askAssistant` (mesma função atual, com flag `voice: true` que pede respostas curtas e sem markdown) -> fala da resposta com a síntese de voz do navegador (voz pt-BR) -> volta a ouvir.
- Interromper: fala do usuário ou botão cancela a síntese em andamento.
- Ações de filtro retornadas são aplicadas via `onAction`, como no chat.
- Só aparece em navegadores com reconhecimento de fala (Chrome, Edge, Safari).
- Limitação: no último teste o serviço de IA retornou erro de acesso aqui no ambiente de teste; se persistir, o modo voz vai ouvir, mas não terá resposta.
