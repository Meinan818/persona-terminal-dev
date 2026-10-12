package com.meinan818.personaterminal.sync;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

/**
 * user_data 表 Mapper。
 * 查询一律在 Service/Controller 内联构造 QueryWrapper（与 UserMapper 同范式）。
 */
@Mapper
public interface UserDataMapper extends BaseMapper<UserData> {
}
