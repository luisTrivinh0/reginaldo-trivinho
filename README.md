# Reginaldo Trivinho — Landing Page

Primeira landing page do modelo de sites profissionais da Retorna, atualmente configurada para Reginaldo Trivinho, Assistente Técnico Jurídico.

## Objetivo

Este repositório funciona em dois papéis:

- site profissional do Reginaldo Trivinho;
- base reutilizável para novas landing pages desenvolvidas pela Retorna.

O projeto é estático, sem build obrigatório, sem banco de dados e sem dependências de runtime.

## Estrutura

- `index.html`: estrutura e conteúdo principal da landing
- `styles.css`: identidade visual e responsividade
- `site.config.js`: configuração central de cliente, contato, repositório e assinatura Retorna
- `app.js`: aplicação das configurações e carregamento dos serviços
- `data/services.json`: catálogo publicado
- `admin/`: área administrativa para CRUD dos serviços
- `favicon.svg`: favicon do cliente
- `netlify.toml`: configuração de publicação e headers para Netlify

## Configuração por cliente

Para reutilizar o template, comece por `site.config.js`.

Centralize nele:

- nome;
- iniciais;
- função ou segmento;
- telefone;
- WhatsApp;
- e-mails;
- repositório GitHub;
- branch;
- assinatura Powered by Retorna.

Depois personalize no `index.html`:

- SEO;
- headline;
- apresentação;
- diferenciais;
- provas;
- textos de contato;
- conteúdo específico do segmento.

Os serviços continuam isolados em `data/services.json`.

## Powered by Retorna

O rodapé público possui uma assinatura discreta:

`Powered by Retorna`

O destino padrão é:

`https://retornaservicos.com.br`

A configuração fica em `site.config.js`.

## Publicação na Netlify

O projeto já está preparado para publicação estática na Netlify.

Configuração esperada:

- repository: este repositório
- branch: `main`
- build command: vazio
- publish directory: `.`

O arquivo `netlify.toml` já define o diretório publicado e headers básicos.

Depois da publicação, um subdomínio pode ser conectado, por exemplo:

`reginaldo.retornaservicos.com.br`

## Área administrativa

Acesse:

`/admin/`

O painel permite:

- cadastrar serviços;
- editar serviços;
- ocultar ou reativar serviços;
- excluir serviços.

As alterações são gravadas diretamente em `data/services.json` e geram commits na branch configurada em `site.config.js`.

## Chave administrativa

A área administrativa usa uma Fine-grained Personal Access Token do GitHub limitada somente ao repositório do cliente.

Configuração recomendada:

- Repository access: **Only select repositories**
- Repository permissions:
  - **Contents: Read and write**

Não conceda permissões adicionais.

A chave não é armazenada no código, em `localStorage` ou em `sessionStorage`. Ela permanece somente na memória da aba enquanto o painel está aberto.

## Segurança e manutenção

Para cada novo cliente:

1. crie um repositório próprio a partir desta base;
2. altere `site.config.js`;
3. personalize conteúdo, favicon e identidade visual;
4. limite o token administrativo somente ao repositório daquele cliente;
5. conecte o repositório à Netlify;
6. aponte o subdomínio ou domínio próprio;
7. valide desktop, mobile, WhatsApp, telefone, e-mails e CRUD.

## Backup da versão anterior

Antes da conversão para template Retorna foi criada a branch:

`backup/pre-retorna-template-2026-09-02`

Ela preserva o estado anterior da landing.
