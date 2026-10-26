import gql from 'graphql-tag';

// 새 탭 첫 화면·새로 고침: 열쇠 하나로 티켓·단계·댓글·처리 기록·첨부 허용 형식을 한 번에 받는다.
// ticket은 서버가 화면에 필요한 항목만 담아 주는 JSON, 댓글·처리 기록은 위젯 조회와 같은 범위.
export const TICKET_VIEW = gql`
  query widgetsTicketView($token: String!) {
    widgetsTicketView(token: $token) {
      ticket
      stages
      comments {
        _id
        content
        attachments {
          name
          url
          type
          size
        }
        createdUser {
          _id
          email
          emails
          phone
          phones
          lastName
          firstName
          avatar
        }
        type
        userType
        createdAt
      }
      activityLogs {
        _id
        action
        contentType
        createdByDetail
        content
        createdAt
      }
      allowedFileTypes
    }
  }
`;

// 새 탭에서 댓글 등록 — 대상 티켓·작성 고객은 열쇠로 정해진다
export const TICKET_VIEW_COMMENT_ADD = gql`
  mutation widgetsTicketViewCommentAdd(
    $token: String!
    $content: String!
    $attachments: [AttachmentInput]
  ) {
    widgetsTicketViewCommentAdd(
      token: $token
      content: $content
      attachments: $attachments
    ) {
      _id
    }
  }
`;
