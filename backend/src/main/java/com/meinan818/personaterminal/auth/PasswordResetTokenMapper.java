package com.meinan818.personaterminal.auth;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface PasswordResetTokenMapper extends BaseMapper<PasswordResetToken> {
}
