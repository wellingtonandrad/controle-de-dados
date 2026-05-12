import type { Metadata } from "next"
import { LegalPageLayout } from "../_components/legal-page-layout"

export const metadata: Metadata = {
  title: "Política de privacidade | Controle de dados",
  description: "Política de privacidade e proteção de dados do Controle de dados.",
  robots: { index: true, follow: true },
}

export default function PrivacidadePage() {
  return (
    <LegalPageLayout title="Política de privacidade">
      <p>
        Esta política descreve, em linguagem acessível, como dados pessoais
        podem ser tratados no contexto do Controle de dados, em alinhamento com a
        Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). O
        controlador das operações indicadas como próprias da plataforma é o
        responsável legal pelo produto Controle de dados (identificação comercial e
        contato devem ser preenchidos na operação real do serviço).
      </p>

      <h2>1. Quais dados podem ser coletados</h2>
      <p>Dependendo do uso, podem ser tratados, entre outros:</p>
      <ul>
        <li>
          Dados de cadastro e autenticação (por exemplo, nome, e-mail,
          identificadores de conta);
        </li>
        <li>
          Dados operacionais da clínica (agendamentos, serviços, equipe,
          estoque, relatórios);
        </li>
        <li>
          Dados de pacientes ou terceiros inseridos pela clínica no sistema;
        </li>
        <li>
          Dados técnicos (logs, IP, tipo de dispositivo) para segurança e
          melhoria do serviço.
        </li>
      </ul>

      <h2>2. Finalidades e bases legais</h2>
      <p>Os dados podem ser utilizados para:</p>
      <ul>
        <li>Prestação e operação da plataforma (execução de contrato);</li>
        <li>Cumprimento de obrigação legal ou regulatória;</li>
        <li>
          Legítimo interesse, quando aplicável (ex.: prevenção a fraudes,
          segurança da informação), respeitando os direitos do titular;
        </li>
        <li>
          Consentimento, quando necessário para finalidades específicas
          previstas em lei.
        </li>
      </ul>

      <h2>3. Compartilhamento com terceiros</h2>
      <p>
        Podem ser utilizados provedores de infraestrutura, autenticação,
        pagamentos, armazenamento de mídia e comunicação, sempre na medida do
        necessário à prestação do serviço, com contratos ou cláusulas compatíveis
        com a LGPD. Não vendemos dados pessoais.
      </p>

      <h2>4. Retenção e eliminação</h2>
      <p>
        Os dados são mantidos pelo tempo necessário para cumprir as finalidades
        descritas, obrigações legais e resolução de litígios. A clínica pode
        solicitar exclusão ou portabilidade conforme a lei e as ferramentas
        disponibilizadas na plataforma.
      </p>

      <h2>5. Direitos dos titulares</h2>
      <p>
        Nos termos da LGPD, o titular pode solicitar confirmação de tratamento,
        acesso, correção, anonimização, portabilidade, eliminação de dados
        desnecessários, informação sobre compartilhamentos e revogação de
        consentimento, quando cabível. Pedidos devem ser feitos ao canal
        indicado pelo controlador, que responderá no prazo legal.
      </p>

      <h2>6. Segurança</h2>
      <p>
        Adotamos medidas técnicas e administrativas razoáveis para proteger os
        dados contra acessos não autorizados e incidentes. Nenhum sistema é
        isento de risco; em caso de incidente relevante, serão adotadas as
        providências previstas em lei.
      </p>

      <h2>7. Cookies e tecnologias similares</h2>
      <p>
        Podem ser utilizados cookies ou tecnologias equivalentes para sessão,
        preferências e métricas. O usuário pode gerenciar cookies no próprio
        navegador.
      </p>

      <h2>8. Encarregado de dados (DPO)</h2>
      <p>
        Quando exigido ou adotado pela operação, o contato do encarregado de
        proteção de dados será disponibilizado nesta página ou em canal
        dedicado.
      </p>

      <h2>9. Alterações desta política</h2>
      <p>
        Esta política pode ser atualizada para refletir mudanças no serviço ou
        na legislação. Recomenda-se revisão periódica desta página.
      </p>
    </LegalPageLayout>
  )
}
