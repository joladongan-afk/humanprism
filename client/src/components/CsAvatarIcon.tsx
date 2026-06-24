/**
 * CS 챗봇 아바타 아이콘
 * 헤드셋 착용, 단정한 올림머리, 콜센터 유니폼, 따뜻한 미소
 */

const CS_AVATAR_URL = "/img/cs_agent_v5_dd33def5.png";

export function CsAvatarIcon() {
  return (
    <img
      src={CS_AVATAR_URL}
      alt="이용 안내 도우미"
      className="w-full h-full object-cover rounded-full"
      style={{ objectPosition: "center 8%" }}
      draggable={false}
    />
  );
}
