# Reginaldo Trivinho — Portfólio Profissional

Portfólio estático de Reginaldo Trivinho, Assistente Técnico Jurídico.

## Estrutura

- `index.html`: página pública
- `styles.css`: identidade visual e responsividade
- `app.js`: carregamento dos serviços
- `data/services.json`: catálogo publicado
- `admin/`: área administrativa com CRUD
- `favicon.svg`: favicon RT

## Publicação

O projeto foi preparado para GitHub Pages, sem build e sem dependências.

No GitHub:

1. Acesse **Settings > Pages**
2. Em **Build and deployment**, selecione **Deploy from a branch**
3. Selecione a branch `main`
4. Selecione a pasta `/ (root)`
5. Salve

O repositório está privado. GitHub Pages em repositórios privados exige um plano compatível, como GitHub Pro. Caso a conta use GitHub Free, torne o repositório público antes de ativar o Pages.

## Área administrativa

Acesse:

`/admin/`

O painel permite:

- cadastrar serviços
- editar serviços
- ocultar ou reativar serviços
- excluir serviços

As alterações são gravadas diretamente em `data/services.json` e geram commits na branch `main`.

## Chave administrativa

A área administrativa usa uma Fine-grained Personal Access Token do GitHub limitada somente a este repositório.

Configuração recomendada:

- Repository access: **Only select repositories**
- Repositório: `luisTrivinh0/reginaldo-trivinho`
- Repository permissions:
  - **Contents: Read and write**

Não conceda permissões adicionais.

A chave não é armazenada no código, em `localStorage` ou em `sessionStorage`. Ela permanece apenas na memória da aba e é descartada ao sair ou fechar a página.

## Contato exibido

- WhatsApp e telefone: +55 11 97267-0073
- reginaldo.trivinho@icloud.com
- retrivinho@gmail.com

## Identidade visual

Paleta principal:

- Azul-marinho `#132238`: confiança, segurança e precisão técnica
- Bronze `#A77943`: experiência, autoridade e sobriedade
- Areia `#F7F5F0`: leitura confortável e apresentação institucional
